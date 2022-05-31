// Copyright 2022 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package schemas

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"cuelang.org/go/cue"
	"cuelang.org/go/cue/cuecontext"
	"cuelang.org/go/cue/load"
	"github.com/perses/perses/internal/config"
	"github.com/sirupsen/logrus"
)

// Validator can be used to run checks on panels, based on cuelang definitions
type Validator interface {
	Validate(panels map[string]json.RawMessage) error
	LoadSchemas()
}

type validator struct {
	schemasConf config.Schemas
	context     *cue.Context
	baseDef     cue.Value
	schemas     *sync.Map
}

// base CUE definition that all charts & panels should meet
const baseChartDef = `
{
	kind: string
	display: {
		name: string
	}
	options: _
}
`

// NewValidator instantiate a validator
func NewValidator(conf config.Schemas) Validator {
	ctx := cuecontext.New()

	// compile the base chart definition
	baseDef := ctx.CompileString(baseChartDef)

	return &validator{
		schemasConf: conf,
		context:     ctx,
		baseDef:     baseDef,
		schemas:     &sync.Map{},
	}
}

// Validate verify a list of panels.
// The panels are matched against the known list of CUE definitions (schemas).
// If no schema matches for at least 1 panel, the validation fails.
func (v *validator) Validate(panels map[string]json.RawMessage) error {
	logrus.Tracef("Panels to validate: %+v", panels)

	var res error

	// go through the panels list
	// the processing stops as soon as it detects an invalid panel -> TODO: improve this to return a list of all the errors encountered ?
	for k, panel := range panels {
		logrus.Tracef("Panel to validate: %s", string(panel))

		// compile the JSON panel into a CUE Value
		value := v.context.CompileBytes(panel)

		// retrieve panel's kind
		kind, err := value.LookupPath(cue.ParsePath("kind")).String()
		if err != nil {
			err = fmt.Errorf("invalid panel %s: %s", k, err) // enrich the error message returned by cue lib
			logrus.Warning(err)
			res = err
			break
		}

		// retrieve the corresponding schema
		schema, ok := v.schemas.Load(kind)
		if !ok {
			err := fmt.Errorf("invalid panel %s: Unknown kind %s", k, kind)
			logrus.Debug(err)
			res = err
			break
		}
		logrus.Tracef("Matching panel %s against schema: %+v", k, schema)

		// do the validation
		unified := value.Unify(schema.(cue.Value))
		opts := []cue.Option{
			cue.Concrete(true),
			cue.Attributes(true),
			cue.Definitions(true),
			cue.Hidden(true),
		}
		err = unified.Validate(opts...)
		if err != nil {
			err = fmt.Errorf("invalid panel %s: %s schema conditions not met: %s", k, kind, err)
			logrus.Debug(err)
			res = err
			break
		}
	}

	if res == nil {
		logrus.Debug("All panels are valid")
	}

	return res
}

// LoadSchemas load the known list of schemas into the validator
func (v *validator) LoadSchemas() {
	chartsPath := filepath.Join(v.schemasConf.Path, v.schemasConf.ChartsFolder)

	charts, err := os.ReadDir(chartsPath)
	if err != nil {
		logrus.WithError(err).Errorf("Not able to read from charts dir %s", chartsPath)
		return
	}

	// reset the validator's schemas list before proceeding
	v.schemas.Range(func(key interface{}, value interface{}) bool {
		v.schemas.Delete(key)
		return true
	})

	// process each chart plugin to convert it into a CUE Value
	// for each chart we check that its schema meets the default specs we expect for any chart, otherwise we dont include it
	for _, chart := range charts {
		if !chart.IsDir() {
			logrus.Warningf("Chart plugin %s is not a folder", chart.Name())
			continue
		}

		schemaPath := filepath.Join(chartsPath, chart.Name())
		var schemaFiles []string

		// Add all the chart's cue files
		err := filepath.Walk(schemaPath, func(path string, info os.FileInfo, err error) error {
			if filepath.Ext(path) == ".cue" {
				schemaFiles = append(schemaFiles, path)
			}
			return nil
		})
		if err != nil {
			logrus.WithError(err).Errorf("Not able to retrieve the chart's schema files from dir %s", schemaPath)
			continue
		}

		// load the cue files into build.Instances slice
		buildInstances := load.Instances(schemaFiles, nil)
		// we strongly assume that only 1 buildInstance should be returned (corresponding to the main definition like #panel), otherwise we skip it
		// TODO can probably be improved
		if len(buildInstances) != 1 {
			logrus.Errorf("The number of build instances for %s is != 1, skipping this chart", schemaPath)
			continue
		}
		buildInstance := buildInstances[0]

		// check for errors on the instances (these are typically parsing errors)
		if buildInstance.Err != nil {
			logrus.WithError(buildInstance.Err).Errorf("Error retrieving schema for %s, skipping this chart", schemaPath)
			continue
		}

		// build Value from the Instance
		schema := v.context.BuildInstance(buildInstance)
		if schema.Err() != nil {
			logrus.WithError(schema.Err()).Errorf("Error during build for %s, skipping this chart", schemaPath)
			continue
		}

		// check if the chart's schema fulfils the base chart requirements
		unified := v.baseDef.Unify(schema)
		if unified.Err() != nil {
			logrus.WithError(unified.Err()).Errorf("Error during schema validation for %s, skipping this chart", schemaPath)
			continue
		}

		// check if another schema for the same Kind was already registered
		kind, _ := schema.LookupPath(cue.ParsePath("kind")).String()
		if _, ok := v.schemas.Load(kind); ok {
			logrus.Errorf("Conflict caused by %s: a schema already exists for kind %s, skipping this chart", schemaPath, kind)
			continue
		}

		v.schemas.Store(kind, schema)
		logrus.Debugf("Loaded schema %s from file %s: %+v", kind, schemaPath, schema)
	}

	logrus.Info("Schemas list (re)loaded")
}
