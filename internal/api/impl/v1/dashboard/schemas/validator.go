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
	schemas     *sync.Map
}

const (
	baseDefFile   = "base.cue"
	generatorFile = "generator.cue"
	kindCuePath   = "#panel.kind"
)

// NewValidator instantiate a validator
func NewValidator(conf config.Schemas) Validator {
	ctx := cuecontext.New()

	return &validator{
		schemasConf: conf,
		context:     ctx,
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

		// retrieve the corresponding chart's schema
		schema, ok := v.schemas.Load(kind)
		if !ok {
			err := fmt.Errorf("invalid panel %s: Unknown kind %s", k, kind)
			logrus.Debug(err)
			res = err
			break
		}
		logrus.Tracef("Matching panel %s against schema: %+v", k, schema)

		// run the validation
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

		// schemaFiles will be the list of CUE files to consider to build the final schema
		var schemaFiles []string
		// - first, put the base chart def
		schemaFiles = append(schemaFiles, filepath.Join(v.schemasConf.Path, baseDefFile))
		// - then, add all the CUE files from this chart
		schemaPath := filepath.Join(chartsPath, chart.Name())
		err := filepath.Walk(schemaPath, func(path string, info os.FileInfo, err error) error {
			if filepath.Ext(path) == ".cue" {
				schemaFiles = append(schemaFiles, path)
				logrus.Tracef("%s registered in schema files list", path)
			}
			return nil
		})
		if err != nil {
			logrus.WithError(err).Errorf("Not able to retrieve the chart's schema files from dir %s", schemaPath)
			continue
		}
		// - then, add all the query types available
		queriesPath := filepath.Join(v.schemasConf.Path, v.schemasConf.QueriesFolder)
		err = filepath.Walk(queriesPath, func(path string, info os.FileInfo, err error) error {
			if filepath.Ext(path) == ".cue" {
				schemaFiles = append(schemaFiles, path)
				logrus.Tracef("%s registered in schema files list", path)
			}
			return nil
		})
		if err != nil {
			logrus.WithError(err).Errorf("Not able to retrieve the query's schema files from dir %s", queriesPath)
			continue
		}

		// build the CUE Value from the files
		schema, err := buildChartValueFromFiles(v.context, schemaFiles)
		if err != nil {
			logrus.WithError(err).Errorf("Not able to build CUE Value for %s, skipping this chart", schemaPath)
			continue
		}

		// check if Kind is defined + if another schema for the same Kind was already registered
		kind, _ := schema.LookupPath(cue.ParsePath(kindCuePath)).String()
		if len(kind) == 0 {
			logrus.Errorf("Expected %s property missing for %s, skipping this chart", kindCuePath, schemaPath)
			logrus.Tracef("%+v", schema)
			continue
		}
		if _, ok := v.schemas.Load(kind); ok {
			logrus.Errorf("Conflict caused by %s: a schema already exists for kind %s, skipping this chart", schemaPath, kind)
			logrus.Tracef("%+v", schema)
			continue
		}

		// at this stage everything is fine, so we add the "generator" CUE file & rebuild the CUE Value, in order to
		// generate the final panel def (ie disjunction with 1 alternative for each kind of datasource+query)
		schemaFiles = append(schemaFiles, filepath.Join(v.schemasConf.Path, generatorFile))
		schema, err = buildChartValueFromFiles(v.context, schemaFiles)
		if err != nil {
			logrus.WithError(err).Errorf("Not able to use the generator for %s, skipping this chart", schemaPath)
			continue
		}

		v.schemas.Store(kind, schema)
		logrus.Debugf("Loaded schema %s from dir %s: %+v", kind, schemaPath, schema)
	}

	logrus.Info("Schemas list (re)loaded")
}

// buildChartValueFromFiles builds a CUE Value representing a chart, from the provided list of CUE files
func buildChartValueFromFiles(context *cue.Context, schemaFiles []string) (cue.Value, error) {
	schema := cue.Value{}
	// build the Instance from the list of files
	// we strongly assume that only 1 buildInstance should be returned (corresponding to the main definition like #panel), otherwise we skip it
	logrus.Tracef("schema files: %s", schemaFiles)
	buildInstances := load.Instances(schemaFiles, nil)
	if len(buildInstances) != 1 {
		err := fmt.Errorf("the number of build instances is != 1")
		return schema, err
	}
	buildInstance := buildInstances[0]

	// check for errors on the instances (these are typically parsing errors)
	if buildInstance.Err != nil {
		return schema, buildInstance.Err
	}

	// build Value from the Instance
	schema = context.BuildInstance(buildInstance)
	if schema.Err() != nil {
		return schema, schema.Err()
	}

	return schema, nil
}
