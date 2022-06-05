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

package pkg

// The final schema to which to match the panels against
// the `or([for...])` block generates 1 alternative for each kind of datasource available
//
// Example of output:
// {
//   kind: "GaugeChart"
//   display: {
//     name: string
//   }
//   datasource: {
//     kind: "SQLDatasource"
//     key?: string
//   }
//   options: {
//     query: {
//       kind: "SQLGraphQuery"
//       options: {
//         select: string
//         from:   string
//         where?: string
//       }
//     }
//     calculation: "First" | "Last" | "LastNumber" | "Mean" | "Sum"
//   }
// } | {
//   kind: "GaugeChart"
//   display: {
//     name: string
//   }
//   datasource: {
//     kind: "PrometheusDatasource"
//     key?: string
//   }
//   options: {
//     query: {
//       kind: "PrometheusGraphQuery"
//       options: {
//         query: string
//       }
//     }
//     calculation: "First" | "Last" | "LastNumber" | "Mean" | "Sum"
//   }
// }

#datasources: {...} // needed for make cue-eval only
#panel: {...}       // needed for make cue-eval only

or([for _, datasource in #datasources {
  #datasource: {
    kind: datasource.kind
  }
  #query: datasource.query

  // inject the definition of #panel
  #panel
}])