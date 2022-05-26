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

import { createContext, useContext } from 'react';
import { registerTheme } from 'echarts';
import { EChartsTheme } from './model';

export interface PersesChartsTheme {
  theme: EChartsTheme;
  themeName?: string;
}

export interface ChartsThemeProviderProps {
  children?: React.ReactNode;
  chartsTheme: PersesChartsTheme;
}

export function ChartsThemeProvider(props: ChartsThemeProviderProps) {
  const {
    children,
    chartsTheme: { themeName, theme },
  } = props;

  if (themeName !== undefined) {
    registerTheme(themeName, theme);
  }

  const themeContext = {
    themeName,
    theme,
  };
  return <ChartsThemeContext.Provider value={themeContext}>{children}</ChartsThemeContext.Provider>;
}

export const ChartsThemeContext = createContext<PersesChartsTheme | undefined>(undefined);

export function useChartsTheme(): PersesChartsTheme {
  const ctx = useContext(ChartsThemeContext);
  if (ctx === undefined) {
    throw new Error('No ChartsThemeContext found. Did you forget a Provider?');
  }
  return ctx;
}