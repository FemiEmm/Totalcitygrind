const ASSET_EXTENSION = /\.(?:png|jpe?g|gif|webp|svg|ico|mp3|wav|ogg)$/i;

export async function resolve(specifier, context, nextResolve) {
  if (ASSET_EXTENSION.test(specifier)) {
    return {
      url: new URL(specifier, context.parentURL).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (ASSET_EXTENSION.test(url)) {
    return {
      format: "module",
      source: "export default " + JSON.stringify(url) + ";",
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
