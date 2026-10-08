// @types/react-dom ships no typings for the `.browser` entry; its API matches `react-dom/server`.
declare module 'react-dom/server.browser' {
  export * from 'react-dom/server';
}
