import { boot } from 'quasar/wrappers';
import VueDnDKitPlugin from '@vue-dnd-kit/core';

export default boot(({ app }) => {
  app.use(VueDnDKitPlugin);
});

