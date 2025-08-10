import { configureStore } from '@reduxjs/toolkit';
import authoring from './testAuthoringSlice';

export const store = configureStore({ reducer: { authoring } });
