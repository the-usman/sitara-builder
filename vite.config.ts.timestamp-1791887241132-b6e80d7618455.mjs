// vite.config.ts
import { cloudflareDevProxyVitePlugin as remixCloudflareDevProxy, vitePlugin as remixVitePlugin } from "file:///C:/Users/NEXT%20GEN/Documents/sitara-builder/node_modules/.pnpm/@remix-run+dev@2.16.3_@remix-run+react@2.16.3_react-dom@18.3.1_react@18.3.1__react@18.3.1_typ_56tyhioi4fkoibvrjndu6yshyi/node_modules/@remix-run/dev/dist/index.js";
import UnoCSS from "file:///C:/Users/NEXT%20GEN/Documents/sitara-builder/node_modules/.pnpm/unocss@0.61.9_postcss@8.5.3_rollup@4.38.0_vite@5.4.15_@types+node@22.13.14_sass-embedded@1.86.0_/node_modules/unocss/dist/vite.mjs";
import { defineConfig } from "file:///C:/Users/NEXT%20GEN/Documents/sitara-builder/node_modules/.pnpm/vite@5.4.15_@types+node@22.13.14_sass-embedded@1.86.0/node_modules/vite/dist/node/index.js";
import { nodePolyfills } from "file:///C:/Users/NEXT%20GEN/Documents/sitara-builder/node_modules/.pnpm/vite-plugin-node-polyfills@0.22.0_rollup@4.38.0_vite@5.4.15_@types+node@22.13.14_sass-embedded@1.86.0_/node_modules/vite-plugin-node-polyfills/dist/index.js";
import { optimizeCssModules } from "file:///C:/Users/NEXT%20GEN/Documents/sitara-builder/node_modules/.pnpm/vite-plugin-optimize-css-modules@1.2.0_vite@5.4.15_@types+node@22.13.14_sass-embedded@1.86.0_/node_modules/vite-plugin-optimize-css-modules/dist/index.mjs";
import tsconfigPaths from "file:///C:/Users/NEXT%20GEN/Documents/sitara-builder/node_modules/.pnpm/vite-tsconfig-paths@4.3.2_typescript@5.8.2_vite@5.4.15_@types+node@22.13.14_sass-embedded@1.86.0_/node_modules/vite-tsconfig-paths/dist/index.mjs";
import * as dotenv from "file:///C:/Users/NEXT%20GEN/Documents/sitara-builder/node_modules/.pnpm/dotenv@16.4.7/node_modules/dotenv/lib/main.js";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
dotenv.config();
var getGitInfo = () => {
  try {
    return {
      commitHash: execSync("git rev-parse --short HEAD").toString().trim(),
      branch: execSync("git rev-parse --abbrev-ref HEAD").toString().trim(),
      commitTime: execSync("git log -1 --format=%cd").toString().trim(),
      author: execSync("git log -1 --format=%an").toString().trim(),
      email: execSync("git log -1 --format=%ae").toString().trim(),
      remoteUrl: execSync("git config --get remote.origin.url").toString().trim(),
      repoName: execSync("git config --get remote.origin.url").toString().trim().replace(/^.*github.com[:/]/, "").replace(/\.git$/, "")
    };
  } catch {
    return {
      commitHash: "no-git-info",
      branch: "unknown",
      commitTime: "unknown",
      author: "unknown",
      email: "unknown",
      remoteUrl: "unknown",
      repoName: "unknown"
    };
  }
};
var getPackageJson = () => {
  try {
    const pkgPath = join(process.cwd(), "package.json");
    const pkg2 = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return {
      name: pkg2.name,
      description: pkg2.description,
      license: pkg2.license,
      dependencies: pkg2.dependencies || {},
      devDependencies: pkg2.devDependencies || {},
      peerDependencies: pkg2.peerDependencies || {},
      optionalDependencies: pkg2.optionalDependencies || {}
    };
  } catch {
    return {
      name: "sitara-builder",
      description: "Sitara Builder \u2014 AI-Powered Full-Stack Web Development",
      license: "MIT",
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
      optionalDependencies: {}
    };
  }
};
var pkg = getPackageJson();
var gitInfo = getGitInfo();
var vite_config_default = defineConfig((config2) => {
  return {
    define: {
      __COMMIT_HASH: JSON.stringify(gitInfo.commitHash),
      __GIT_BRANCH: JSON.stringify(gitInfo.branch),
      __GIT_COMMIT_TIME: JSON.stringify(gitInfo.commitTime),
      __GIT_AUTHOR: JSON.stringify(gitInfo.author),
      __GIT_EMAIL: JSON.stringify(gitInfo.email),
      __GIT_REMOTE_URL: JSON.stringify(gitInfo.remoteUrl),
      __GIT_REPO_NAME: JSON.stringify(gitInfo.repoName),
      __APP_VERSION: JSON.stringify(process.env.npm_package_version),
      __PKG_NAME: JSON.stringify(pkg.name),
      __PKG_DESCRIPTION: JSON.stringify(pkg.description),
      __PKG_LICENSE: JSON.stringify(pkg.license),
      __PKG_DEPENDENCIES: JSON.stringify(pkg.dependencies),
      __PKG_DEV_DEPENDENCIES: JSON.stringify(pkg.devDependencies),
      __PKG_PEER_DEPENDENCIES: JSON.stringify(pkg.peerDependencies),
      __PKG_OPTIONAL_DEPENDENCIES: JSON.stringify(pkg.optionalDependencies),
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV)
    },
    build: {
      target: "esnext",
      rollupOptions: {
        output: {
          format: "esm"
        }
      },
      commonjsOptions: {
        transformMixedEsModules: true
      }
    },
    ssr: {
      resolve: {
        conditions: ["worker", "browser", "module", "import", "default"],
        externalConditions: ["worker", "browser"]
      }
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: "globalThis"
        }
      }
    },
    resolve: {
      alias: {
        buffer: "vite-plugin-node-polyfills/polyfills/buffer"
      }
    },
    plugins: [
      nodePolyfills({
        include: ["buffer", "process", "util", "stream"],
        globals: {
          Buffer: true,
          process: true,
          global: true
        },
        protocolImports: true,
        exclude: ["child_process", "fs", "path"]
      }),
      {
        name: "buffer-polyfill",
        transform(code, id) {
          if (id.includes("env.mjs")) {
            return {
              code: `import { Buffer } from 'buffer';
${code}`,
              map: null
            };
          }
          return null;
        }
      },
      config2.mode === "development" && process.env.CLOUDFLARE_DEV_PROXY !== "false" && remixCloudflareDevProxy(),
      remixVitePlugin({
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_lazyRouteDiscovery: true
        }
      }),
      UnoCSS(),
      tsconfigPaths(),
      chrome129IssuePlugin(),
      config2.mode === "production" && optimizeCssModules({ apply: "build" })
    ],
    envPrefix: [
      "VITE_",
      "OPENAI_LIKE_API_BASE_URL",
      "OLLAMA_API_BASE_URL",
      "LMSTUDIO_API_BASE_URL",
      "TOGETHER_API_BASE_URL"
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler"
        }
      }
    }
  };
});
function chrome129IssuePlugin() {
  return {
    name: "chrome129IssuePlugin",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.headers["user-agent"]?.match(/Chrom(e|ium)\/([0-9]+)\./);
        if (raw) {
          const version = parseInt(raw[2], 10);
          if (version === 129) {
            res.setHeader("content-type", "text/html");
            res.end(
              '<body><h1>Please use Chrome Canary for testing.</h1><p>Chrome 129 has an issue with JavaScript modules & Vite local development, see <a href="https://github.com/stackblitz/bolt.new/issues/86#issuecomment-2395519258">for more information.</a></p><p><b>Note:</b> This only impacts <u>local development</u>. `pnpm run build` and `pnpm run start` will work fine in this browser.</p></body>'
            );
            return;
          }
        }
        next();
      });
    }
  };
}
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxORVhUIEdFTlxcXFxEb2N1bWVudHNcXFxcc2l0YXJhLWJ1aWxkZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXE5FWFQgR0VOXFxcXERvY3VtZW50c1xcXFxzaXRhcmEtYnVpbGRlclxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvTkVYVCUyMEdFTi9Eb2N1bWVudHMvc2l0YXJhLWJ1aWxkZXIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBjbG91ZGZsYXJlRGV2UHJveHlWaXRlUGx1Z2luIGFzIHJlbWl4Q2xvdWRmbGFyZURldlByb3h5LCB2aXRlUGx1Z2luIGFzIHJlbWl4Vml0ZVBsdWdpbiB9IGZyb20gJ0ByZW1peC1ydW4vZGV2JztcclxuaW1wb3J0IFVub0NTUyBmcm9tICd1bm9jc3Mvdml0ZSc7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgdHlwZSBWaXRlRGV2U2VydmVyIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCB7IG5vZGVQb2x5ZmlsbHMgfSBmcm9tICd2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxscyc7XHJcbmltcG9ydCB7IG9wdGltaXplQ3NzTW9kdWxlcyB9IGZyb20gJ3ZpdGUtcGx1Z2luLW9wdGltaXplLWNzcy1tb2R1bGVzJztcclxuaW1wb3J0IHRzY29uZmlnUGF0aHMgZnJvbSAndml0ZS10c2NvbmZpZy1wYXRocyc7XHJcbmltcG9ydCAqIGFzIGRvdGVudiBmcm9tICdkb3RlbnYnO1xyXG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XHJcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxuXHJcbmRvdGVudi5jb25maWcoKTtcclxuXHJcbi8vIEdldCBkZXRhaWxlZCBnaXQgaW5mbyB3aXRoIGZhbGxiYWNrc1xyXG5jb25zdCBnZXRHaXRJbmZvID0gKCkgPT4ge1xyXG4gIHRyeSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBjb21taXRIYXNoOiBleGVjU3luYygnZ2l0IHJldi1wYXJzZSAtLXNob3J0IEhFQUQnKS50b1N0cmluZygpLnRyaW0oKSxcclxuICAgICAgYnJhbmNoOiBleGVjU3luYygnZ2l0IHJldi1wYXJzZSAtLWFiYnJldi1yZWYgSEVBRCcpLnRvU3RyaW5nKCkudHJpbSgpLFxyXG4gICAgICBjb21taXRUaW1lOiBleGVjU3luYygnZ2l0IGxvZyAtMSAtLWZvcm1hdD0lY2QnKS50b1N0cmluZygpLnRyaW0oKSxcclxuICAgICAgYXV0aG9yOiBleGVjU3luYygnZ2l0IGxvZyAtMSAtLWZvcm1hdD0lYW4nKS50b1N0cmluZygpLnRyaW0oKSxcclxuICAgICAgZW1haWw6IGV4ZWNTeW5jKCdnaXQgbG9nIC0xIC0tZm9ybWF0PSVhZScpLnRvU3RyaW5nKCkudHJpbSgpLFxyXG4gICAgICByZW1vdGVVcmw6IGV4ZWNTeW5jKCdnaXQgY29uZmlnIC0tZ2V0IHJlbW90ZS5vcmlnaW4udXJsJykudG9TdHJpbmcoKS50cmltKCksXHJcbiAgICAgIHJlcG9OYW1lOiBleGVjU3luYygnZ2l0IGNvbmZpZyAtLWdldCByZW1vdGUub3JpZ2luLnVybCcpXHJcbiAgICAgICAgLnRvU3RyaW5nKClcclxuICAgICAgICAudHJpbSgpXHJcbiAgICAgICAgLnJlcGxhY2UoL14uKmdpdGh1Yi5jb21bOi9dLywgJycpXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcLmdpdCQvLCAnJyksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY29tbWl0SGFzaDogJ25vLWdpdC1pbmZvJyxcclxuICAgICAgYnJhbmNoOiAndW5rbm93bicsXHJcbiAgICAgIGNvbW1pdFRpbWU6ICd1bmtub3duJyxcclxuICAgICAgYXV0aG9yOiAndW5rbm93bicsXHJcbiAgICAgIGVtYWlsOiAndW5rbm93bicsXHJcbiAgICAgIHJlbW90ZVVybDogJ3Vua25vd24nLFxyXG4gICAgICByZXBvTmFtZTogJ3Vua25vd24nLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcblxyXG4vLyBSZWFkIHBhY2thZ2UuanNvbiB3aXRoIGRldGFpbGVkIGRlcGVuZGVuY3kgaW5mb1xyXG5jb25zdCBnZXRQYWNrYWdlSnNvbiA9ICgpID0+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgcGtnUGF0aCA9IGpvaW4ocHJvY2Vzcy5jd2QoKSwgJ3BhY2thZ2UuanNvbicpO1xyXG4gICAgY29uc3QgcGtnID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGtnUGF0aCwgJ3V0Zi04JykpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIG5hbWU6IHBrZy5uYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogcGtnLmRlc2NyaXB0aW9uLFxyXG4gICAgICBsaWNlbnNlOiBwa2cubGljZW5zZSxcclxuICAgICAgZGVwZW5kZW5jaWVzOiBwa2cuZGVwZW5kZW5jaWVzIHx8IHt9LFxyXG4gICAgICBkZXZEZXBlbmRlbmNpZXM6IHBrZy5kZXZEZXBlbmRlbmNpZXMgfHwge30sXHJcbiAgICAgIHBlZXJEZXBlbmRlbmNpZXM6IHBrZy5wZWVyRGVwZW5kZW5jaWVzIHx8IHt9LFxyXG4gICAgICBvcHRpb25hbERlcGVuZGVuY2llczogcGtnLm9wdGlvbmFsRGVwZW5kZW5jaWVzIHx8IHt9LFxyXG4gICAgfTtcclxuICB9IGNhdGNoIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG5hbWU6ICdzaXRhcmEtYnVpbGRlcicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2l0YXJhIEJ1aWxkZXIgXHUyMDE0IEFJLVBvd2VyZWQgRnVsbC1TdGFjayBXZWIgRGV2ZWxvcG1lbnQnLFxyXG4gICAgICBsaWNlbnNlOiAnTUlUJyxcclxuICAgICAgZGVwZW5kZW5jaWVzOiB7fSxcclxuICAgICAgZGV2RGVwZW5kZW5jaWVzOiB7fSxcclxuICAgICAgcGVlckRlcGVuZGVuY2llczoge30sXHJcbiAgICAgIG9wdGlvbmFsRGVwZW5kZW5jaWVzOiB7fSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuY29uc3QgcGtnID0gZ2V0UGFja2FnZUpzb24oKTtcclxuY29uc3QgZ2l0SW5mbyA9IGdldEdpdEluZm8oKTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoY29uZmlnKSA9PiB7XHJcbiAgcmV0dXJuIHtcclxuICAgIGRlZmluZToge1xyXG4gICAgICBfX0NPTU1JVF9IQVNIOiBKU09OLnN0cmluZ2lmeShnaXRJbmZvLmNvbW1pdEhhc2gpLFxyXG4gICAgICBfX0dJVF9CUkFOQ0g6IEpTT04uc3RyaW5naWZ5KGdpdEluZm8uYnJhbmNoKSxcclxuICAgICAgX19HSVRfQ09NTUlUX1RJTUU6IEpTT04uc3RyaW5naWZ5KGdpdEluZm8uY29tbWl0VGltZSksXHJcbiAgICAgIF9fR0lUX0FVVEhPUjogSlNPTi5zdHJpbmdpZnkoZ2l0SW5mby5hdXRob3IpLFxyXG4gICAgICBfX0dJVF9FTUFJTDogSlNPTi5zdHJpbmdpZnkoZ2l0SW5mby5lbWFpbCksXHJcbiAgICAgIF9fR0lUX1JFTU9URV9VUkw6IEpTT04uc3RyaW5naWZ5KGdpdEluZm8ucmVtb3RlVXJsKSxcclxuICAgICAgX19HSVRfUkVQT19OQU1FOiBKU09OLnN0cmluZ2lmeShnaXRJbmZvLnJlcG9OYW1lKSxcclxuICAgICAgX19BUFBfVkVSU0lPTjogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYubnBtX3BhY2thZ2VfdmVyc2lvbiksXHJcbiAgICAgIF9fUEtHX05BTUU6IEpTT04uc3RyaW5naWZ5KHBrZy5uYW1lKSxcclxuICAgICAgX19QS0dfREVTQ1JJUFRJT046IEpTT04uc3RyaW5naWZ5KHBrZy5kZXNjcmlwdGlvbiksXHJcbiAgICAgIF9fUEtHX0xJQ0VOU0U6IEpTT04uc3RyaW5naWZ5KHBrZy5saWNlbnNlKSxcclxuICAgICAgX19QS0dfREVQRU5ERU5DSUVTOiBKU09OLnN0cmluZ2lmeShwa2cuZGVwZW5kZW5jaWVzKSxcclxuICAgICAgX19QS0dfREVWX0RFUEVOREVOQ0lFUzogSlNPTi5zdHJpbmdpZnkocGtnLmRldkRlcGVuZGVuY2llcyksXHJcbiAgICAgIF9fUEtHX1BFRVJfREVQRU5ERU5DSUVTOiBKU09OLnN0cmluZ2lmeShwa2cucGVlckRlcGVuZGVuY2llcyksXHJcbiAgICAgIF9fUEtHX09QVElPTkFMX0RFUEVOREVOQ0lFUzogSlNPTi5zdHJpbmdpZnkocGtnLm9wdGlvbmFsRGVwZW5kZW5jaWVzKSxcclxuICAgICAgJ3Byb2Nlc3MuZW52Lk5PREVfRU5WJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuTk9ERV9FTlYpLFxyXG4gICAgfSxcclxuICAgIGJ1aWxkOiB7XHJcbiAgICAgIHRhcmdldDogJ2VzbmV4dCcsXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgIGZvcm1hdDogJ2VzbScsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgY29tbW9uanNPcHRpb25zOiB7XHJcbiAgICAgICAgdHJhbnNmb3JtTWl4ZWRFc01vZHVsZXM6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgc3NyOiB7XHJcbiAgICAgIHJlc29sdmU6IHtcclxuICAgICAgICBjb25kaXRpb25zOiBbJ3dvcmtlcicsICdicm93c2VyJywgJ21vZHVsZScsICdpbXBvcnQnLCAnZGVmYXVsdCddLFxyXG4gICAgICAgIGV4dGVybmFsQ29uZGl0aW9uczogWyd3b3JrZXInLCAnYnJvd3NlciddLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIG9wdGltaXplRGVwczoge1xyXG4gICAgICBlc2J1aWxkT3B0aW9uczoge1xyXG4gICAgICAgIGRlZmluZToge1xyXG4gICAgICAgICAgZ2xvYmFsOiAnZ2xvYmFsVGhpcycsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgYnVmZmVyOiAndml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvcG9seWZpbGxzL2J1ZmZlcicsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICBub2RlUG9seWZpbGxzKHtcclxuICAgICAgICBpbmNsdWRlOiBbJ2J1ZmZlcicsICdwcm9jZXNzJywgJ3V0aWwnLCAnc3RyZWFtJ10sXHJcbiAgICAgICAgZ2xvYmFsczoge1xyXG4gICAgICAgICAgQnVmZmVyOiB0cnVlLFxyXG4gICAgICAgICAgcHJvY2VzczogdHJ1ZSxcclxuICAgICAgICAgIGdsb2JhbDogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHByb3RvY29sSW1wb3J0czogdHJ1ZSxcclxuICAgICAgICBleGNsdWRlOiBbJ2NoaWxkX3Byb2Nlc3MnLCAnZnMnLCAncGF0aCddLFxyXG4gICAgICB9KSxcclxuICAgICAge1xyXG4gICAgICAgIG5hbWU6ICdidWZmZXItcG9seWZpbGwnLFxyXG4gICAgICAgIHRyYW5zZm9ybShjb2RlLCBpZCkge1xyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdlbnYubWpzJykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICBjb2RlOiBgaW1wb3J0IHsgQnVmZmVyIH0gZnJvbSAnYnVmZmVyJztcXG4ke2NvZGV9YCxcclxuICAgICAgICAgICAgICBtYXA6IG51bGwsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgY29uZmlnLm1vZGUgPT09ICdkZXZlbG9wbWVudCcgJiYgcHJvY2Vzcy5lbnYuQ0xPVURGTEFSRV9ERVZfUFJPWFkgIT09ICdmYWxzZScgJiYgcmVtaXhDbG91ZGZsYXJlRGV2UHJveHkoKSxcclxuICAgICAgcmVtaXhWaXRlUGx1Z2luKHtcclxuICAgICAgICBmdXR1cmU6IHtcclxuICAgICAgICAgIHYzX2ZldGNoZXJQZXJzaXN0OiB0cnVlLFxyXG4gICAgICAgICAgdjNfcmVsYXRpdmVTcGxhdFBhdGg6IHRydWUsXHJcbiAgICAgICAgICB2M190aHJvd0Fib3J0UmVhc29uOiB0cnVlLFxyXG4gICAgICAgICAgdjNfbGF6eVJvdXRlRGlzY292ZXJ5OiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgICBVbm9DU1MoKSxcclxuICAgICAgdHNjb25maWdQYXRocygpLFxyXG4gICAgICBjaHJvbWUxMjlJc3N1ZVBsdWdpbigpLFxyXG4gICAgICBjb25maWcubW9kZSA9PT0gJ3Byb2R1Y3Rpb24nICYmIG9wdGltaXplQ3NzTW9kdWxlcyh7IGFwcGx5OiAnYnVpbGQnIH0pLFxyXG4gICAgXSxcclxuICAgIGVudlByZWZpeDogW1xyXG4gICAgICAnVklURV8nLFxyXG4gICAgICAnT1BFTkFJX0xJS0VfQVBJX0JBU0VfVVJMJyxcclxuICAgICAgJ09MTEFNQV9BUElfQkFTRV9VUkwnLFxyXG4gICAgICAnTE1TVFVESU9fQVBJX0JBU0VfVVJMJyxcclxuICAgICAgJ1RPR0VUSEVSX0FQSV9CQVNFX1VSTCcsXHJcbiAgICBdLFxyXG4gICAgY3NzOiB7XHJcbiAgICAgIHByZXByb2Nlc3Nvck9wdGlvbnM6IHtcclxuICAgICAgICBzY3NzOiB7XHJcbiAgICAgICAgICBhcGk6ICdtb2Rlcm4tY29tcGlsZXInLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH07XHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gY2hyb21lMTI5SXNzdWVQbHVnaW4oKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIG5hbWU6ICdjaHJvbWUxMjlJc3N1ZVBsdWdpbicsXHJcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyOiBWaXRlRGV2U2VydmVyKSB7XHJcbiAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgcmF3ID0gcmVxLmhlYWRlcnNbJ3VzZXItYWdlbnQnXT8ubWF0Y2goL0Nocm9tKGV8aXVtKVxcLyhbMC05XSspXFwuLyk7XHJcblxyXG4gICAgICAgIGlmIChyYXcpIHtcclxuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBwYXJzZUludChyYXdbMl0sIDEwKTtcclxuXHJcbiAgICAgICAgICBpZiAodmVyc2lvbiA9PT0gMTI5KSB7XHJcbiAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L2h0bWwnKTtcclxuICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAnPGJvZHk+PGgxPlBsZWFzZSB1c2UgQ2hyb21lIENhbmFyeSBmb3IgdGVzdGluZy48L2gxPjxwPkNocm9tZSAxMjkgaGFzIGFuIGlzc3VlIHdpdGggSmF2YVNjcmlwdCBtb2R1bGVzICYgVml0ZSBsb2NhbCBkZXZlbG9wbWVudCwgc2VlIDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vc3RhY2tibGl0ei9ib2x0Lm5ldy9pc3N1ZXMvODYjaXNzdWVjb21tZW50LTIzOTU1MTkyNThcIj5mb3IgbW9yZSBpbmZvcm1hdGlvbi48L2E+PC9wPjxwPjxiPk5vdGU6PC9iPiBUaGlzIG9ubHkgaW1wYWN0cyA8dT5sb2NhbCBkZXZlbG9wbWVudDwvdT4uIGBwbnBtIHJ1biBidWlsZGAgYW5kIGBwbnBtIHJ1biBzdGFydGAgd2lsbCB3b3JrIGZpbmUgaW4gdGhpcyBicm93c2VyLjwvcD48L2JvZHk+JyxcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG5leHQoKTtcclxuICAgICAgfSk7XHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0VCxTQUFTLGdDQUFnQyx5QkFBeUIsY0FBYyx1QkFBdUI7QUFDbmEsT0FBTyxZQUFZO0FBQ25CLFNBQVMsb0JBQXdDO0FBQ2pELFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsMEJBQTBCO0FBQ25DLE9BQU8sbUJBQW1CO0FBQzFCLFlBQVksWUFBWTtBQUN4QixTQUFTLGdCQUFnQjtBQUN6QixTQUFTLG9CQUFvQjtBQUM3QixTQUFTLFlBQVk7QUFFZCxjQUFPO0FBR2QsSUFBTSxhQUFhLE1BQU07QUFDdkIsTUFBSTtBQUNGLFdBQU87QUFBQSxNQUNMLFlBQVksU0FBUyw0QkFBNEIsRUFBRSxTQUFTLEVBQUUsS0FBSztBQUFBLE1BQ25FLFFBQVEsU0FBUyxpQ0FBaUMsRUFBRSxTQUFTLEVBQUUsS0FBSztBQUFBLE1BQ3BFLFlBQVksU0FBUyx5QkFBeUIsRUFBRSxTQUFTLEVBQUUsS0FBSztBQUFBLE1BQ2hFLFFBQVEsU0FBUyx5QkFBeUIsRUFBRSxTQUFTLEVBQUUsS0FBSztBQUFBLE1BQzVELE9BQU8sU0FBUyx5QkFBeUIsRUFBRSxTQUFTLEVBQUUsS0FBSztBQUFBLE1BQzNELFdBQVcsU0FBUyxvQ0FBb0MsRUFBRSxTQUFTLEVBQUUsS0FBSztBQUFBLE1BQzFFLFVBQVUsU0FBUyxvQ0FBb0MsRUFDcEQsU0FBUyxFQUNULEtBQUssRUFDTCxRQUFRLHFCQUFxQixFQUFFLEVBQy9CLFFBQVEsVUFBVSxFQUFFO0FBQUEsSUFDekI7QUFBQSxFQUNGLFFBQVE7QUFDTixXQUFPO0FBQUEsTUFDTCxZQUFZO0FBQUEsTUFDWixRQUFRO0FBQUEsTUFDUixZQUFZO0FBQUEsTUFDWixRQUFRO0FBQUEsTUFDUixPQUFPO0FBQUEsTUFDUCxXQUFXO0FBQUEsTUFDWCxVQUFVO0FBQUEsSUFDWjtB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UTtBQUFBLFVBQ1IsU0FBUztBQUFBLFVBQ1QsUUFBUTtBQUFBLFFBQ1Y7QUFBQSxRQUNBLGlCQUFpQjtBQUFBLFFBQ2pCLFNBQVMsQ0FBQyxpQkFBaUIsTUFBTSxNQUFNO0FBQUEsTUFDekMsQ0FBQztBQUFBLE1BQ0Q7QUFBQSxRQUNFLE1BQU07QUFBQSxRQUNOLFVBQVUsTUFBTSxJQUFJO0FBQ2xCLGNBQUksR0FBRyxTQUFTLFNBQVMsR0FBRztBQUMxQixtQkFBTztBQUFBLGNBQ0wsTUFBTTtBQUFBLEVBQXFDLElBQUk7QUFBQSxjQUMvQyxLQUFLO0FBQUEsWUFDUDtBQUFBLFVBQ0Y7QUFFQSxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsTUFDQUEsUUFBTyxTQUFTLGlCQUFpQixRQUFRLElBQUkseUJBQXlCLFdBQVcsd0JBQXdCO0FBQUEsTUFDekcsZ0JBQWdCO0FBQUEsUUFDZCxRQUFRO0FBQUEsVUFDTixtQkFBbUI7QUFBQSxVQUNuQixzQkFBc0I7QUFBQSxVQUN0QixxQkFBcUI7QUFBQSxVQUNyQix1QkFBdUI7QUFBQSxRQUN6QjtBQUFBLE1BQ0YsQ0FBQztBQUFBLE1BQ0QsT0FBTztBQUFBLE1BQ1AsY0FBYztBQUFBLE1BQ2QscUJBQXFCO0FBQUEsTUFDckJBLFFBQU8sU0FBUyxnQkFBZ0IsbUJBQW1CLEVBQUUsT0FBTyxRQUFRLENBQUM7QUFBQSxJQUN2RTtBQUFBLElBQ0EsV0FBVztBQUFBLE1BQ1Q7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0EsS0FBSztBQUFBLE1BQ0gscUJBQXFCO0FBQUEsUUFDbkIsTUFBTTtBQUFBLFVBQ0osS0FBSztBQUFBLFFBQ1A7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDO0FBRUQsU0FBUyx1QkFBdUI7QUFDOUIsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sZ0JBQWdCLFFBQXVCO0FBQ3JDLGFBQU8sWUFBWSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVM7QUFDekMsY0FBTSxNQUFNLElBQUksUUFBUSxZQUFZLEdBQUcsTUFBTSwwQkFBMEI7QUFFdkUsWUFBSSxLQUFLO0FBQ1AsZ0JBQU0sVUFBVSxTQUFTLElBQUksQ0FBQyxHQUFHLEVBQUU7QUFFbkMsY0FBSSxZQUFZLEtBQUs7QUFDbkIsZ0JBQUksVUFBVSxnQkFBZ0IsV0FBVztBQUN6QyxnQkFBSTtBQUFBLGNBQ0Y7QUFBQSxZQUNGO0FBRUE7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUVBLGFBQUs7QUFBQSxNQUNQLENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDRjtBQUNGOyIsCiAgIm5hbWVzIjogWyJwa2ciLCAiY29uZmlnIl0KfQo=
