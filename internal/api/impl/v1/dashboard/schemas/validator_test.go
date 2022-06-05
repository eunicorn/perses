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
	"testing"
	"time"

	"github.com/perses/perses/internal/config"
	v1 "github.com/perses/perses/pkg/model/api/v1"
	"github.com/perses/perses/pkg/model/api/v1/common"
	"github.com/perses/perses/pkg/model/api/v1/dashboard"
	"github.com/perses/perses/pkg/model/api/v1/datasource"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
)

func TestValidateDashboard(t *testing.T) {
	testSuite := []struct {
		title     string
		dashboard *v1.Dashboard
		result    string
	}{
		{
			title: "dashboard containing valid panels",
			dashboard: &v1.Dashboard{
				Kind: v1.KindDashboard,
				Metadata: v1.ProjectMetadata{
					Metadata: v1.Metadata{
						Name: "SimpleDashboard",
					},
					Project: "perses",
				},
				Spec: v1.DashboardSpec{
					Datasource: dashboard.Datasource{
						Name: "PrometheusDemo",
						Kind: datasource.PrometheusKind,
					},
					Duration:  model.Duration(6 * time.Hour),
					Variables: nil,
					Panels: map[string]json.RawMessage{
						"MyAwesomePanel": []byte(`
							{
								"kind": "AwesomeChart",
								"display": {
									"name": "simple awesome chart",
								},
								"datasource": {
									"kind": "CustomDatasource",
									"key": "MyCustomDatasource"
								},
								"options": {
									"a": "yes",
									"b": {
										"c": [
											{
												"e": "up",
												"f": "the up metric"
											}
										]
									},
									queries: [
										{
											"kind": "CustomGraphQuery",
											"options": {
												"custom": true
											}
										},
										{
											"kind": "CustomGraphQuery",
											"options": {
												"custom": false
											}
										}
									]
								}
							}
						`),
						"MyAveragePanel": []byte(`
							{
								"kind": "AverageChart",
								"display": {
									"name": "simple average chart",
								},
								"datasource": {
									"kind": "SQLDatasource",
								},
								"options": {
									"a": "yes",
									"b": {
										"c": false,
										"d": [
											{
												"f": 66
											}
										]
									},
									query: {
										"kind": "SQLGraphQuery",
										"options": {
											"select": "*"
											"from": "TABLE"
											"where": "ID > 0"
										}
									}
								}
							}
						`),
					},
					Entrypoint: &common.JSONRef{
						Ref: "#/spec/layouts/main",
					},
					Layouts: map[string]*dashboard.Layout{
						"main": {
							Kind: dashboard.KindExpandLayout,
							Parameter: dashboard.ExpandLayoutParameter{
								Open: false,
								Children: []*common.JSONRef{
									{
										Ref: "#/spec/panels/MyAveragePanel",
									},
									{
										Ref: "#/spec/panels/MyAwesomePanel",
									},
								},
							},
						},
					},
				},
			},
			result: "",
		},
		{
			title: "dashboard containing an invalid panel",
			dashboard: &v1.Dashboard{
				Kind: v1.KindDashboard,
				Metadata: v1.ProjectMetadata{
					Metadata: v1.Metadata{
						Name: "SimpleDashboard",
					},
					Project: "perses",
				},
				Spec: v1.DashboardSpec{
					Datasource: dashboard.Datasource{
						Name: "PrometheusDemo",
						Kind: datasource.PrometheusKind,
					},
					Duration:  model.Duration(6 * time.Hour),
					Variables: nil,
					Panels: map[string]json.RawMessage{
						"MyInvalidPanel": []byte(`
							{
								"kind": "AwesomeChart",
								"display": {
									"aaaaaa": "simple awesome chart",
								},
								"datasource": {
									"kind": "CustomDatasource",
									"key": "CustomGraphQuery"
								},
								"options": {
									"a": "no",
									"b": {
										"c": [
											{
												"e": "up",
												"f": "the up metric"
											}
										]
									},
									queries: [
										{
											"kind": "CustomGraphQuery",
											"options": {
												"custom": true
											}
										},
										{
											"kind": "CustomGraphQuery",
											"options": {
												"custom": false
											}
										}
									]
								}
							}
						`),
						"MyAveragePanel": []byte(`
							{
								"kind": "AverageChart",
								"display": {
									"name": "simple average chart",
								},
								"datasource": {
									"kind": "SQLDatasource",
									"key": "MySQLDatasource"
								},
								"options": {
									"a": "yes",
									"b": {
										"c": false,
										"d": [
											{
												"f": 66
											}
										]
									},
									query: {
										"kind": "SQUALGraphQuery",
										"options": {
											"select": "*"
											"from": "TABLE"
											"where": "ID < 100"
										}
									}
								}
							}
						`),
					},
					Entrypoint: &common.JSONRef{
						Ref: "#/spec/layouts/main",
					},
					Layouts: map[string]*dashboard.Layout{
						"main": {
							Kind: dashboard.KindExpandLayout,
							Parameter: dashboard.ExpandLayoutParameter{
								Open: false,
								Children: []*common.JSONRef{
									{
										Ref: "#/spec/panels/MyAveragePanel",
									},
									{
										Ref: "#/spec/panels/MyAwesomePanel",
									},
								},
							},
						},
					},
				},
			},

			// TODO to be improved! bring back "invalid panel MyInvalidPanel: AwesomeChart schema conditions not met: display: field not allowed: aaaaaa"
			result: "invalid panel MyInvalidPanel: AwesomeChart schema conditions not met: 1 errors in empty disjunction: (and 1 more errors)",
		},
	}
	for _, test := range testSuite {
		t.Run(test.title, func(t *testing.T) {
			validator := NewValidator(config.Schemas{
				Path:          "testdata",
				ChartsFolder:  "charts",
				QueriesFolder: "queries",
			})
			validator.LoadSchemas()

			err := validator.Validate(test.dashboard.Spec.Panels)
			errString := ""
			if err != nil {
				errString = err.Error()
			}
			assert.Equal(t, test.result, errString)
		})
	}
}
