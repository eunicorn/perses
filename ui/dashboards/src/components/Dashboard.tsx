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

import { Box, BoxProps } from '@mui/material';
import { ErrorBoundary, ErrorAlert } from '@perses-dev/components';
import { DashboardSpec } from '@perses-dev/core';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { GridItemContent } from './GridLayout';
import { GridTitle } from './GridLayout/GridTitle';

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface DashboardProps extends BoxProps {
  spec: DashboardSpec;
}

/**
 * Renders a Dashboard for the provided Dashboard spec.
 */
export function Dashboard(props: DashboardProps) {
  const { spec, ...others } = props;
  console.log('spec.layouts', spec.layouts);

  // const rows = [
  //   {
  //     id: 'a',
  //     x: 0,
  //     y: 0,
  //     w: 24,
  //     h: 18,
  //   },
  //   {
  //     id: 'b',
  //     x: 0,
  //     y: 18,
  //     w: 24,
  //     h: 18,
  //   },
  //   {
  //     id: 'c',
  //     x: 36,
  //     y: 0,
  //     w: 24,
  //     h: 18,
  //   },
  // ];

  const dashboard: any[] = [];

  // flatten spec.layouts
  for (let i = 0; i < spec.layouts.length; i++) {
    const rowHeight = 2;
    const rowWidth = 24;
    const row = {
      content: { $ref: `#/spec/panels/row` },
      id: `row-${i}`,
      x: 0,
      y: rowHeight * i,
      width: rowWidth,
      height: rowHeight,
      title: spec.layouts[i]?.spec.display?.title,
    };
    dashboard.push(row);
    spec.layouts[i]?.spec.items.forEach((item) => {
      dashboard.push(item);
    });
  }

  console.log('dashboard', dashboard);

  const renderGridItems = (panel: any, index: number) => {
    console.log('panel', panel);
    const { title, x, y, width, height, content } = panel;
    if (title) {
      return (
        <div key={index} data-grid={{ x, y, w: width, h: height }}>
          <GridTitle title={title} />
        </div>
      );
    }

    return (
      <div key={index} data-grid={{ x, y, w: width, h: height }}>
        <GridItemContent content={content} spec={spec} />
      </div>
    );
  };

  return (
    <Box {...others} sx={{ position: 'relative' }}>
      <ErrorBoundary FallbackComponent={ErrorAlert}>
        <div
          style={{
            width: '100%',
            height: '100%',
            opacity: '0.14',
            backgroundPosition: '-1px -1px',
            backgroundSize: '30px 30px',
            position: 'absolute',
            backgroundImage:
              'repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 30px),repeating-linear-gradient(-90deg, #fff, #fff 1px, transparent 1px, transparent 30px)',
          }}
        ></div>
        <ResponsiveGridLayout
          className="layout"
          // layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 24, md: 24, sm: 24, xs: 24, xxs: 12 }}
          resizeHandles={['se']}
          rowHeight={36}
          measureBeforeMount={false}
          // onResizeStop={handleResize}
          draggableHandle={'.grid-drag-handle'}
        >
          {/* {spec.layouts.map((layout, idx) => (
            <GridLayout
              ref={gridRef}
              data-grid={{ ...rows[idx] }}
              key={idx}
              definition={layout}
              renderGridItemContent={(definition) => <GridItemContent content={definition.content} spec={spec} />}
            />
          ))} */}
          {dashboard.map(renderGridItems)}
        </ResponsiveGridLayout>
      </ErrorBoundary>
    </Box>
  );
}
