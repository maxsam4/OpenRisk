// Ambient declaration so `tsc --noEmit` resolves CSS Module imports outside
// Next's bundler. Next provides the same typing via next-env.d.ts at build time.
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
