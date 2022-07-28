/* eslint-disable react/display-name */
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
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { useState, forwardRef, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Box, BoxProps, Collapse } from '@mui/material';
import { GridDefinition, GridItemDefinition } from '@perses-dev/core';
import { GridTitle } from './GridTitle';

const COLUMNS = 24;

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface GridLayoutProps extends BoxProps {
  definition: GridDefinition;
  renderGridItemContent: (definition: GridItemDefinition) => React.ReactNode;
}

/**
 * Layout component that arranges children in a Grid based on the definition.
 */
export const GridLayout = forwardRef((props: GridLayoutProps) => {
  const {
    definition: { spec },
    renderGridItemContent,
    ...others
  } = props;

  const [isOpen, setIsOpen] = useState(spec.display?.collapse?.open ?? true);

  const gridItems: React.ReactNode[] = [];
  let mobileRowStart = 1;

  const gridRef = useRef();

  spec.items.forEach((item, idx) => {
    // Try to maintain the chart's aspect ratio on mobile
    const widthScale = COLUMNS / item.width;
    const mobileRows = Math.floor(item.height * widthScale);

    console.log('item', item);
    const { x, y, width, height, id } = item;

    gridItems.push(
      // <Box
      //   key={idx}
      //   sx={{
      //     gridColumn: {
      //       xs: `1 / span ${COLUMNS}`,
      //       sm: `${item.x + 1} / span ${item.width}`,
      //     },
      //     gridRow: {
      //       xs: `${mobileRowStart} / span ${mobileRows}`,
      //       sm: `${item.y + 1} / span ${item.height}`,
      //     },
      //   }}
      // >
      //   {renderGridItemContent(item)}
      // </Box>
      <div key={id} data-grid={{ x, y, w: width, h: height }}>
        {renderGridItemContent(item)}
      </div>
    );

    mobileRowStart += mobileRows;
  });

  return (
    <Box ref={gridRef} {...others} component="section" sx={{ '& + &': { marginTop: (theme) => theme.spacing(1) } }}>
      {spec.display !== undefined && (
        <GridTitle
          title={spec.display.title}
          collapse={
            spec.display.collapse === undefined
              ? undefined
              : { isOpen, onToggleOpen: () => setIsOpen((current) => !current) }
          }
        />
      )}
      <Collapse in={isOpen} unmountOnExit>
        {/* <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
            gridAutoRows: {
              xs: 24,
              sm: 36,
            },
            columnGap: (theme) => theme.spacing(1),
            rowGap: (theme) => theme.spacing(1),
          }}
        >
          {gridItems}
        </Box> */}
        <ResponsiveGridLayout
          className="layout"
          // layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 24, md: 24, sm: 24, xs: 24, xxs: 12 }}
          resizeHandles={['se']}
          rowHeight={36}
          measureBeforeMount={false}
          draggableHandle={'.grid-drag-handle'}
        >
          {gridItems}
        </ResponsiveGridLayout>
      </Collapse>
    </Box>
  );
});
