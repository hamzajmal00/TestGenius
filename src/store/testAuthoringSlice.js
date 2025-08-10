import { createSlice } from '@reduxjs/toolkit';

const initial = {
  selectedStories: [],
  settings: {
    framework: 'cypress',
    style: 'gherkin',
    depth: 'smoke',
    negatives: false,
    dataStrategy: 'faker',
  },
  activeSuite: null,
  activeCase: null,
};

const slice = createSlice({
  name: 'authoring',
  initialState: initial,
  reducers: {
    setSelectedStories: (s, a) => {
      s.selectedStories = a.payload;
    },
    setSettings: (s, a) => {
      s.settings = { ...s.settings, ...a.payload };
    },
    setActiveSuite: (s, a) => {
      s.activeSuite = a.payload;
    },
    setActiveCase: (s, a) => {
      s.activeCase = a.payload;
    },
  },
});

export const {
  setSelectedStories,
  setSettings,
  setActiveSuite,
  setActiveCase,
} = slice.actions;
export default slice.reducer;
