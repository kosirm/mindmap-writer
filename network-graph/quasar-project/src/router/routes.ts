import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'test1', component: () => import('pages/Test1Basic.vue') },
      { path: 'test2', component: () => import('pages/Test2CustomNodes.vue') },
      { path: 'test3', component: () => import('pages/Test3DragLayout.vue') },
      { path: 'test4', component: () => import('pages/Test4Performance.vue') },
      { path: 'test5', component: () => import('pages/Test5Minimap.vue') },
      { path: 'test6', component: () => import('pages/Test6ZoomControls.vue') },
      { path: 'test7', component: () => import('pages/Test7ContextMenu.vue') },
      { path: 'test8', component: () => import('pages/Test8Collapse.vue') },
      { path: 'test9', component: () => import('pages/Test9Stress.vue') },
      { path: 'test-mindmap', component: () => import('pages/TestMindMap.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
