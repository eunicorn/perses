// Copyright 2021 The Perses Authors
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

import { Box, BoxProps, Card } from '@mui/material';
import { ErrorBoundary, ErrorAlert } from '@perses-dev/components';
import { DashboardSpec, GridItemDefinition } from '@perses-dev/core';
import { useLayouts } from '../context/store';
import { GridLayout, GridItemContent } from './GridLayout';

export interface DashboardProps extends BoxProps {
  spec: DashboardSpec;
}

/**
 * Renders a Dashboard for the provided Dashboard spec.
 */
export function Dashboard(props: DashboardProps) {
  const { spec, ...others } = props;

  const { layouts } = useLayouts();

  const renderGridItemContent = (definition: GridItemDefinition) => {
    if (definition.content.$ref === '#/spec/panels/newPanel') {
      return (
        <Card
          sx={{
            ...others.sx,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexFlow: 'column nowrap',
          }}
          variant="outlined"
        >
          New Panel
        </Card>
      );
    }
    return <GridItemContent content={definition.content} spec={spec} />;
  };

  return (
    <Box {...others}>
      <ErrorBoundary FallbackComponent={ErrorAlert}>
        {layouts.map((layout, idx) => (
          <GridLayout key={idx} definition={layout} renderGridItemContent={renderGridItemContent} />
        ))}
      </ErrorBoundary>
    </Box>
  );
}
