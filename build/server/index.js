import { jsxs, Fragment, jsx } from 'react/jsx-runtime';
import { Meta, Links, Outlet, ScrollRestoration, Scripts, RemixServer, useLoaderData, useNavigate, Form, useRevalidator, useActionData, useNavigation } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';
import { createHead, renderHeadToString } from 'remix-island';
import { useStore } from '@nanostores/react';
import { map, atom, computed } from 'nanostores';
import Cookies from 'js-cookie';
import { Chalk } from 'chalk';
import * as React from 'react';
import React__default, { useEffect, useRef, useState, useCallback, memo, forwardRef, useMemo, createContext, useContext, useImperativeHandle, useLayoutEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ClientOnly } from 'remix-utils/client-only';
import { json, redirect } from '@remix-run/cloudflare';
import { generateText, streamText as streamText$1, convertToCoreMessages, createDataStream, generateId as generateId$1 } from 'ai';
import process from 'vite-plugin-node-polyfills/shims/process';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createCohere } from '@ai-sdk/cohere';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { ollama } from 'ollama-ai-provider';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { defaultSchema } from 'rehype-sanitize';
import ignore from 'ignore';
import Buffer, { Buffer as Buffer$1 } from 'vite-plugin-node-polyfills/shims/buffer';
import dns from 'dns';
import { MongoClient } from 'mongodb';
import JSZip from 'jszip';
import { jwtVerify, SignJWT } from 'jose';
import { timingSafeEqual, scrypt } from 'crypto';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { toast } from 'react-toastify';
import { cva } from 'class-variance-authority';
import '@webcontainer/api';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web/index.js';
import * as Dialog$1 from '@radix-ui/react-dialog';
import { Root, Close } from '@radix-ui/react-dialog';
import pathBrowserify from 'path-browserify';
import { getEncoding } from 'istextorbinary';
import { createTwoFilesPatch } from 'diff';
import fileSaver from 'file-saver';
import { Octokit } from '@octokit/rest';
import { cubicBezier, motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';
import { QRCode } from 'react-qrcode-logo';

const tailwindReset = "/assets/tailwind-compat-Bwh-BmjE.css";

const chalk = new Chalk({ level: 3 });
let currentLevel = "info";
const logger$g = {
  trace: (...messages) => log("trace", void 0, messages),
  debug: (...messages) => log("debug", void 0, messages),
  info: (...messages) => log("info", void 0, messages),
  warn: (...messages) => log("warn", void 0, messages),
  error: (...messages) => log("error", void 0, messages),
  setLevel
};
function createScopedLogger(scope) {
  return {
    trace: (...messages) => log("trace", scope, messages),
    debug: (...messages) => log("debug", scope, messages),
    info: (...messages) => log("info", scope, messages),
    warn: (...messages) => log("warn", scope, messages),
    error: (...messages) => log("error", scope, messages),
    setLevel
  };
}
function setLevel(level) {
  if ((level === "trace" || level === "debug") && true) {
    return;
  }
  currentLevel = level;
}
function log(level, scope, messages) {
  const levelOrder = ["trace", "debug", "info", "warn", "error"];
  if (levelOrder.indexOf(level) < levelOrder.indexOf(currentLevel)) {
    return;
  }
  const allMessages = messages.reduce((acc, current) => {
    if (acc.endsWith("\n")) {
      return acc + current;
    }
    if (!acc) {
      return current;
    }
    return `${acc} ${current}`;
  }, "");
  const labelBackgroundColor = getColorForLevel(level);
  const labelTextColor = level === "warn" ? "#000000" : "#FFFFFF";
  const labelStyles = getLabelStyles(labelBackgroundColor, labelTextColor);
  const scopeStyles = getLabelStyles("#77828D", "white");
  const styles = [labelStyles];
  if (typeof scope === "string") {
    styles.push("", scopeStyles);
  }
  let labelText = formatText(` ${level.toUpperCase()} `, labelTextColor, labelBackgroundColor);
  if (scope) {
    labelText = `${labelText} ${formatText(` ${scope} `, "#FFFFFF", "77828D")}`;
  }
  if (typeof window !== "undefined") {
    console.log(`%c${level.toUpperCase()}${scope ? `%c %c${scope}` : ""}`, ...styles, allMessages);
  } else {
    console.log(`${labelText}`, allMessages);
  }
}
function formatText(text, color, bg) {
  return chalk.bgHex(bg)(chalk.hex(color)(text));
}
function getLabelStyles(color, textColor) {
  return `background-color: ${color}; color: white; border: 4px solid ${color}; color: ${textColor};`;
}
function getColorForLevel(level) {
  switch (level) {
    case "trace":
    case "debug": {
      return "#77828D";
    }
    case "info": {
      return "#1389FD";
    }
    case "warn": {
      return "#FFDB6C";
    }
    case "error": {
      return "#EE4744";
    }
    default: {
      return "#000000";
    }
  }
}

const logger$f = createScopedLogger("LogStore");
const MAX_LOGS = 1e3;
class LogStore {
  _logs = map({});
  showLogs = atom(true);
  _readLogs = /* @__PURE__ */ new Set();
  constructor() {
    this._loadLogs();
    if (typeof window !== "undefined") {
      this._loadReadLogs();
    }
  }
  // Expose the logs store for subscription
  get logs() {
    return this._logs;
  }
  _loadLogs() {
    const savedLogs = Cookies.get("eventLogs");
    if (savedLogs) {
      try {
        const parsedLogs = JSON.parse(savedLogs);
        this._logs.set(parsedLogs);
      } catch (error) {
        logger$f.error("Failed to parse logs from cookies:", error);
      }
    }
  }
  _loadReadLogs() {
    if (typeof window === "undefined") {
      return;
    }
    const savedReadLogs = localStorage.getItem("bolt_read_logs");
    if (savedReadLogs) {
      try {
        const parsedReadLogs = JSON.parse(savedReadLogs);
        this._readLogs = new Set(parsedReadLogs);
      } catch (error) {
        logger$f.error("Failed to parse read logs:", error);
      }
    }
  }
  _saveLogs() {
    const currentLogs = this._logs.get();
    Cookies.set("eventLogs", JSON.stringify(currentLogs));
  }
  _saveReadLogs() {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem("bolt_read_logs", JSON.stringify(Array.from(this._readLogs)));
  }
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  _trimLogs() {
    const currentLogs = Object.entries(this._logs.get());
    if (currentLogs.length > MAX_LOGS) {
      const sortedLogs = currentLogs.sort(
        ([, a], [, b]) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const newLogs = Object.fromEntries(sortedLogs.slice(0, MAX_LOGS));
      this._logs.set(newLogs);
    }
  }
  // Base log method for general logging
  _addLog(message, level, category, details, metadata) {
    const id = this._generateId();
    const entry = {
      id,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      message,
      details,
      category,
      metadata
    };
    this._logs.setKey(id, entry);
    this._trimLogs();
    this._saveLogs();
    return id;
  }
  // Specialized method for API logging
  _addApiLog(message, method, url, details) {
    const statusCode = details.statusCode;
    return this._addLog(message, statusCode >= 400 ? "error" : "info", "api", details, {
      component: "api",
      action: method
    });
  }
  // System events
  logSystem(message, details) {
    return this._addLog(message, "info", "system", details);
  }
  // Provider events
  logProvider(message, details) {
    return this._addLog(message, "info", "provider", details);
  }
  // User actions
  logUserAction(message, details) {
    return this._addLog(message, "info", "user", details);
  }
  // API Connection Logging
  logAPIRequest(endpoint, method, duration, statusCode, details) {
    const message = `${method} ${endpoint} - ${statusCode} (${duration}ms)`;
    const level = statusCode >= 400 ? "error" : statusCode >= 300 ? "warning" : "info";
    return this._addLog(message, level, "api", {
      ...details,
      endpoint,
      method,
      duration,
      statusCode,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  // Authentication Logging
  logAuth(action, success, details) {
    const message = `Auth ${action} - ${success ? "Success" : "Failed"}`;
    const level = success ? "info" : "error";
    return this._addLog(message, level, "auth", {
      ...details,
      action,
      success,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  // Network Status Logging
  logNetworkStatus(status, details) {
    const message = `Network ${status}`;
    const level = status === "offline" ? "error" : status === "reconnecting" ? "warning" : "info";
    return this._addLog(message, level, "network", {
      ...details,
      status,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  // Database Operations Logging
  logDatabase(operation, success, duration, details) {
    const message = `DB ${operation} - ${success ? "Success" : "Failed"} (${duration}ms)`;
    const level = success ? "info" : "error";
    return this._addLog(message, level, "database", {
      ...details,
      operation,
      success,
      duration,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  // Error events
  logError(message, error, details) {
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...details
    } : { error, ...details };
    return this._addLog(message, "error", "error", errorDetails);
  }
  // Warning events
  logWarning(message, details) {
    return this._addLog(message, "warning", "system", details);
  }
  // Debug events
  logDebug(message, details) {
    return this._addLog(message, "debug", "system", details);
  }
  clearLogs() {
    this._logs.set({});
    this._saveLogs();
  }
  getLogs() {
    return Object.values(this._logs.get()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  getFilteredLogs(level, category, searchQuery) {
    return this.getLogs().filter((log) => {
      const matchesLevel = !level || level === "debug" || log.level === level;
      const matchesCategory = !category || log.category === category;
      const matchesSearch = !searchQuery || log.message.toLowerCase().includes(searchQuery.toLowerCase()) || JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLevel && matchesCategory && matchesSearch;
    });
  }
  markAsRead(logId) {
    this._readLogs.add(logId);
    this._saveReadLogs();
  }
  isRead(logId) {
    return this._readLogs.has(logId);
  }
  clearReadLogs() {
    this._readLogs.clear();
    this._saveReadLogs();
  }
  // API interactions
  logApiCall(method, endpoint, statusCode, duration, requestData, responseData) {
    return this._addLog(
      `API ${method} ${endpoint}`,
      statusCode >= 400 ? "error" : "info",
      "api",
      {
        method,
        endpoint,
        statusCode,
        duration,
        request: requestData,
        response: responseData
      },
      {
        component: "api",
        action: method
      }
    );
  }
  // Network operations
  logNetworkRequest(method, url, statusCode, duration, requestData, responseData) {
    return this._addLog(
      `${method} ${url}`,
      statusCode >= 400 ? "error" : "info",
      "network",
      {
        method,
        url,
        statusCode,
        duration,
        request: requestData,
        response: responseData
      },
      {
        component: "network",
        action: method
      }
    );
  }
  // Authentication events
  logAuthEvent(event, success, details) {
    return this._addLog(
      `Auth ${event} ${success ? "succeeded" : "failed"}`,
      success ? "info" : "error",
      "auth",
      details,
      {
        component: "auth",
        action: event
      }
    );
  }
  // Performance tracking
  logPerformance(operation, duration, details) {
    return this._addLog(
      `Performance: ${operation}`,
      duration > 1e3 ? "warning" : "info",
      "performance",
      {
        operation,
        duration,
        ...details
      },
      {
        component: "performance",
        action: "metric"
      }
    );
  }
  // Error handling
  logErrorWithStack(error, category = "error", details) {
    return this._addLog(
      error.message,
      "error",
      category,
      {
        ...details,
        name: error.name,
        stack: error.stack
      },
      {
        component: category,
        action: "error"
      }
    );
  }
  // Refresh logs (useful for real-time updates)
  refreshLogs() {
    const currentLogs = this._logs.get();
    this._logs.set({ ...currentLogs });
  }
  // Enhanced logging methods
  logInfo(message, details) {
    return this._addLog(message, "info", "system", details);
  }
  logSuccess(message, details) {
    return this._addLog(message, "info", "system", { ...details, success: true });
  }
  logApiRequest(method, url, details) {
    return this._addApiLog(`API ${method} ${url}`, method, url, details);
  }
  logSettingsChange(component, setting, oldValue, newValue) {
    return this._addLog(
      `Settings changed in ${component}: ${setting}`,
      "info",
      "settings",
      {
        setting,
        previousValue: oldValue,
        newValue
      },
      {
        component,
        action: "settings_change",
        previousValue: oldValue,
        newValue
      }
    );
  }
  logFeatureToggle(featureId, enabled) {
    return this._addLog(
      `Feature ${featureId} ${enabled ? "enabled" : "disabled"}`,
      "info",
      "feature",
      { featureId, enabled },
      {
        component: "features",
        action: "feature_toggle"
      }
    );
  }
  logTaskOperation(taskId, operation, status, details) {
    return this._addLog(
      `Task ${taskId}: ${operation} - ${status}`,
      "info",
      "task",
      { taskId, operation, status, ...details },
      {
        component: "task-manager",
        action: "task_operation"
      }
    );
  }
  logProviderAction(provider, action, success, details) {
    return this._addLog(
      `Provider ${provider}: ${action} - ${success ? "Success" : "Failed"}`,
      success ? "info" : "error",
      "provider",
      { provider, action, success, ...details },
      {
        component: "providers",
        action: "provider_action"
      }
    );
  }
  logPerformanceMetric(component, operation, duration, details) {
    return this._addLog(
      `Performance: ${component} - ${operation} took ${duration}ms`,
      duration > 1e3 ? "warning" : "info",
      "performance",
      { component, operation, duration, ...details },
      {
        component,
        action: "performance_metric"
      }
    );
  }
}
const logStore = new LogStore();

const kTheme = "bolt_theme";
const DEFAULT_THEME = "light";
const themeStore = atom(initStore());
function initStore() {
  return DEFAULT_THEME;
}
function toggleTheme() {
  const currentTheme = themeStore.get();
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  themeStore.set(newTheme);
  localStorage.setItem(kTheme, newTheme);
  document.querySelector("html")?.setAttribute("data-theme", newTheme);
  try {
    const userProfile = localStorage.getItem("bolt_user_profile");
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      profile.theme = newTheme;
      localStorage.setItem("bolt_user_profile", JSON.stringify(profile));
    }
  } catch (error) {
    console.error("Error updating user profile theme:", error);
  }
  logStore.logSystem(`Theme changed to ${newTheme} mode`);
}

function stripIndents(arg0, ...values) {
  if (typeof arg0 !== "string") {
    const processedString = arg0.reduce((acc, curr, i) => {
      acc += curr + (values[i] ?? "");
      return acc;
    }, "");
    return _stripIndents(processedString);
  }
  return _stripIndents(arg0);
}
function _stripIndents(value) {
  return value.split("\n").map((line) => line.trim()).join("\n").trimStart().replace(/[\r\n]$/, "");
}

const reactToastifyStyles = "/assets/ReactToastify-Bh76j7cs.css";

const globalStyles = "/assets/index-CM_WZdAp.css";

const xtermStyles = "/assets/xterm-LZoznX6r.css";

const links = () => [
  {
    rel: "icon",
    href: "/favicon.svg",
    type: "image/svg+xml"
  },
  { rel: "stylesheet", href: reactToastifyStyles },
  { rel: "stylesheet", href: tailwindReset },
  { rel: "stylesheet", href: globalStyles },
  { rel: "stylesheet", href: xtermStyles },
  {
    rel: "preconnect",
    href: "https://fonts.googleapis.com"
  },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous"
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  }
];
const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;
const Head = createHead(() => /* @__PURE__ */ jsxs(Fragment, { children: [
  /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
  /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
  /* @__PURE__ */ jsx(Meta, {}),
  /* @__PURE__ */ jsx(Links, {}),
  /* @__PURE__ */ jsx("script", { dangerouslySetInnerHTML: { __html: inlineThemeCode } })
] }));
function Layout({ children }) {
  const theme = useStore(themeStore);
  useEffect(() => {
    document.querySelector("html")?.setAttribute("data-theme", theme);
  }, [theme]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(ClientOnly, { children: () => /* @__PURE__ */ jsx(DndProvider, { backend: HTML5Backend, children }) }),
    /* @__PURE__ */ jsx(ScrollRestoration, {}),
    /* @__PURE__ */ jsx(Scripts, {})
  ] });
}
function App() {
  const theme = useStore(themeStore);
  useEffect(() => {
    logStore.logSystem("Application initialized", {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }, []);
  return /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Outlet, {}) });
}

const route0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  Head,
  Layout,
  default: App,
  links
}, Symbol.toStringTag, { value: 'Module' }));

async function handleRequest(request, responseStatusCode, responseHeaders, remixContext, _loadContext) {
  const readable = await renderToReadableStream(/* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url }), {
    signal: request.signal,
    onError(error) {
      console.error(error);
      responseStatusCode = 500;
    }
  });
  const body = new ReadableStream({
    start(controller) {
      const head = renderHeadToString({ request, remixContext, Head });
      controller.enqueue(
        new Uint8Array(
          new TextEncoder().encode(
            `<!DOCTYPE html><html lang="en" data-theme="${themeStore.value}"><head>${head}</head><body><div id="root" class="w-full h-full">`
          )
        )
      );
      const reader = readable.getReader();
      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            controller.enqueue(new Uint8Array(new TextEncoder().encode("</div></body></html>")));
            controller.close();
            return;
          }
          controller.enqueue(value);
          read();
        }).catch((error) => {
          controller.error(error);
          readable.cancel();
        });
      }
      read();
    },
    cancel() {
      readable.cancel();
    }
  });
  if (isbot(request.headers.get("user-agent") || "")) {
    await readable.allReady;
  }
  responseHeaders.set("Content-Type", "text/html");
  responseHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
  responseHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode
  });
}

const entryServer = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: 'Module' }));

const MAX_TOKENS = 8e3;
const MAX_RESPONSE_SEGMENTS = 2;
const IGNORE_PATTERNS$2 = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  ".next/**",
  "coverage/**",
  ".cache/**",
  ".vscode/**",
  ".idea/**",
  "**/*.log",
  "**/.DS_Store",
  "**/npm-debug.log*",
  "**/yarn-debug.log*",
  "**/yarn-error.log*",
  "**/*lock.json",
  "**/*lock.yml"
];

class BaseProvider {
  cachedDynamicModels;
  getApiKeyLink;
  labelForGetApiKey;
  icon;
  getProviderBaseUrlAndKey(options) {
    const { apiKeys, providerSettings, serverEnv, defaultBaseUrlKey, defaultApiTokenKey } = options;
    let settingsBaseUrl = providerSettings?.baseUrl;
    const manager = LLMManager.getInstance();
    if (settingsBaseUrl && settingsBaseUrl.length == 0) {
      settingsBaseUrl = void 0;
    }
    const baseUrlKey = this.config.baseUrlKey || defaultBaseUrlKey;
    let baseUrl = settingsBaseUrl || serverEnv?.[baseUrlKey] || process?.env?.[baseUrlKey] || manager.env?.[baseUrlKey] || this.config.baseUrl;
    if (baseUrl && baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }
    const apiTokenKey = this.config.apiTokenKey || defaultApiTokenKey;
    const apiKey = apiKeys?.[this.name] || serverEnv?.[apiTokenKey] || process?.env?.[apiTokenKey] || manager.env?.[apiTokenKey];
    return {
      baseUrl,
      apiKey
    };
  }
  getModelsFromCache(options) {
    if (!this.cachedDynamicModels) {
      return null;
    }
    const cacheKey = this.cachedDynamicModels.cacheId;
    const generatedCacheKey = this.getDynamicModelsCacheKey(options);
    if (cacheKey !== generatedCacheKey) {
      this.cachedDynamicModels = void 0;
      return null;
    }
    return this.cachedDynamicModels.models;
  }
  getDynamicModelsCacheKey(options) {
    return JSON.stringify({
      apiKeys: options.apiKeys?.[this.name],
      providerSettings: options.providerSettings?.[this.name],
      serverEnv: options.serverEnv
    });
  }
  storeDynamicModels(options, models) {
    const cacheId = this.getDynamicModelsCacheKey(options);
    this.cachedDynamicModels = {
      cacheId,
      models
    };
  }
}
function getOpenAILikeModel(baseURL, apiKey, model) {
  const openai = createOpenAI({
    baseURL,
    apiKey
  });
  return openai(model);
}

class AnthropicProvider extends BaseProvider {
  name = "Anthropic";
  getApiKeyLink = "https://console.anthropic.com/settings/keys";
  config = {
    apiTokenKey: "ANTHROPIC_API_KEY"
  };
  staticModels = [
    {
      name: "claude-3-7-sonnet-20250219",
      label: "Claude 3.7 Sonnet",
      provider: "Anthropic",
      maxTokenAllowed: 8e3
    },
    {
      name: "claude-3-5-sonnet-latest",
      label: "Claude 3.5 Sonnet (new)",
      provider: "Anthropic",
      maxTokenAllowed: 8e3
    },
    {
      name: "claude-3-5-sonnet-20240620",
      label: "Claude 3.5 Sonnet (old)",
      provider: "Anthropic",
      maxTokenAllowed: 8e3
    },
    {
      name: "claude-3-5-haiku-latest",
      label: "Claude 3.5 Haiku (new)",
      provider: "Anthropic",
      maxTokenAllowed: 8e3
    },
    { name: "claude-3-opus-latest", label: "Claude 3 Opus", provider: "Anthropic", maxTokenAllowed: 8e3 },
    { name: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet", provider: "Anthropic", maxTokenAllowed: 8e3 },
    { name: "claude-3-haiku-20240307", label: "Claude 3 Haiku", provider: "Anthropic", maxTokenAllowed: 8e3 }
  ];
  async getDynamicModels(apiKeys, settings, serverEnv) {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "ANTHROPIC_API_KEY"
    });
    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }
    const response = await fetch(`https://api.anthropic.com/v1/models`, {
      headers: {
        "x-api-key": `${apiKey}`,
        "anthropic-version": "2023-06-01"
      }
    });
    const res = await response.json();
    const staticModelIds = this.staticModels.map((m) => m.name);
    const data = res.data.filter((model) => model.type === "model" && !staticModelIds.includes(model.id));
    return data.map((m) => ({
      name: m.id,
      label: `${m.display_name}`,
      provider: this.name,
      maxTokenAllowed: 32e3
    }));
  }
  getModelInstance = (options) => {
    const { apiKeys, providerSettings, serverEnv, model } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings,
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "ANTHROPIC_API_KEY"
    });
    const anthropic = createAnthropic({
      apiKey
    });
    return anthropic(model);
  };
}

class CohereProvider extends BaseProvider {
  name = "Cohere";
  getApiKeyLink = "https://dashboard.cohere.com/api-keys";
  config = {
    apiTokenKey: "COHERE_API_KEY"
  };
  staticModels = [
    { name: "command-r-plus-08-2024", label: "Command R plus Latest", provider: "Cohere", maxTokenAllowed: 4096 },
    { name: "command-r-08-2024", label: "Command R Latest", provider: "Cohere", maxTokenAllowed: 4096 },
    { name: "command-r-plus", label: "Command R plus", provider: "Cohere", maxTokenAllowed: 4096 },
    { name: "command-r", label: "Command R", provider: "Cohere", maxTokenAllowed: 4096 },
    { name: "command", label: "Command", provider: "Cohere", maxTokenAllowed: 4096 },
    { name: "command-nightly", label: "Command Nightly", provider: "Cohere", maxTokenAllowed: 4096 },
    { name: "command-light", label: "Command Light", provider: "Cohere", maxTokenAllowed: 4096 },
    { name: "command-light-nightly", label: "Command Light Nightly", provider: "Cohere", maxTokenAllowed: 4096 },
    { name: "c4ai-aya-expanse-8b", label: "c4AI Aya Expanse 8b", provider: "Cohere", maxTokenAllowed: 4096 },
    { name: "c4ai-aya-expanse-32b", label: "c4AI Aya Expanse 32b", provider: "Cohere", maxTokenAllowed: 4096 }
  ];
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "COHERE_API_KEY"
    });
    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }
    const cohere = createCohere({
      apiKey
    });
    return cohere(model);
  }
}

class DeepseekProvider extends BaseProvider {
  name = "Deepseek";
  getApiKeyLink = "https://platform.deepseek.com/apiKeys";
  config = {
    apiTokenKey: "DEEPSEEK_API_KEY"
  };
  staticModels = [
    { name: "deepseek-coder", label: "Deepseek-Coder", provider: "Deepseek", maxTokenAllowed: 8e3 },
    { name: "deepseek-chat", label: "Deepseek-Chat", provider: "Deepseek", maxTokenAllowed: 8e3 },
    { name: "deepseek-reasoner", label: "Deepseek-Reasoner", provider: "Deepseek", maxTokenAllowed: 8e3 }
  ];
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "DEEPSEEK_API_KEY"
    });
    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }
    const deepseek = createDeepSeek({
      apiKey
    });
    return deepseek(model, {
      // simulateStreaming: true,
    });
  }
}

class GoogleProvider extends BaseProvider {
  name = "Google";
  getApiKeyLink = "https://aistudio.google.com/app/apikey";
  config = {
    apiTokenKey: "GOOGLE_GENERATIVE_AI_API_KEY"
  };
  staticModels = [
    { name: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash", provider: "Google", maxTokenAllowed: 8192 },
    {
      name: "gemini-2.0-flash-thinking-exp-01-21",
      label: "Gemini 2.0 Flash-thinking-exp-01-21",
      provider: "Google",
      maxTokenAllowed: 65536
    },
    { name: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash", provider: "Google", maxTokenAllowed: 8192 },
    { name: "gemini-1.5-flash-002", label: "Gemini 1.5 Flash-002", provider: "Google", maxTokenAllowed: 8192 },
    { name: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash-8b", provider: "Google", maxTokenAllowed: 8192 },
    { name: "gemini-1.5-pro-latest", label: "Gemini 1.5 Pro", provider: "Google", maxTokenAllowed: 8192 },
    { name: "gemini-1.5-pro-002", label: "Gemini 1.5 Pro-002", provider: "Google", maxTokenAllowed: 8192 },
    { name: "gemini-exp-1206", label: "Gemini exp-1206", provider: "Google", maxTokenAllowed: 8192 }
  ];
  async getDynamicModels(apiKeys, settings, serverEnv) {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "GOOGLE_GENERATIVE_AI_API_KEY"
    });
    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      headers: {
        ["Content-Type"]: "application/json"
      }
    });
    const res = await response.json();
    const data = res.models.filter((model) => model.outputTokenLimit > 8e3);
    return data.map((m) => ({
      name: m.name.replace("models/", ""),
      label: `${m.displayName} - context ${Math.floor((m.inputTokenLimit + m.outputTokenLimit) / 1e3) + "k"}`,
      provider: this.name,
      maxTokenAllowed: m.inputTokenLimit + m.outputTokenLimit || 8e3
    }));
  }
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "GOOGLE_GENERATIVE_AI_API_KEY"
    });
    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }
    const google = createGoogleGenerativeAI({
      apiKey
    });
    return google(model);
  }
}

class GroqProvider extends BaseProvider {
  name = "Groq";
  getApiKeyLink = "https://console.groq.com/keys";
  config = {
    apiTokenKey: "GROQ_API_KEY"
  };
  staticModels = [
    { name: "llama-3.1-8b-instant", label: "Llama 3.1 8b (Groq)", provider: "Groq", maxTokenAllowed: 8e3 },
    { name: "llama-3.2-11b-vision-preview", label: "Llama 3.2 11b (Groq)", provider: "Groq", maxTokenAllowed: 8e3 },
    { name: "llama-3.2-90b-vision-preview", label: "Llama 3.2 90b (Groq)", provider: "Groq", maxTokenAllowed: 8e3 },
    { name: "llama-3.2-3b-preview", label: "Llama 3.2 3b (Groq)", provider: "Groq", maxTokenAllowed: 8e3 },
    { name: "llama-3.2-1b-preview", label: "Llama 3.2 1b (Groq)", provider: "Groq", maxTokenAllowed: 8e3 },
    { name: "llama-3.3-70b-versatile", label: "Llama 3.3 70b (Groq)", provider: "Groq", maxTokenAllowed: 8e3 },
    {
      name: "deepseek-r1-distill-llama-70b",
      label: "Deepseek R1 Distill Llama 70b (Groq)",
      provider: "Groq",
      maxTokenAllowed: 131072
    }
  ];
  async getDynamicModels(apiKeys, settings, serverEnv) {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "GROQ_API_KEY"
    });
    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }
    const response = await fetch(`https://api.groq.com/openai/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    const res = await response.json();
    const data = res.data.filter(
      (model) => model.object === "model" && model.active && model.context_window > 8e3
    );
    return data.map((m) => ({
      name: m.id,
      label: `${m.id} - context ${m.context_window ? Math.floor(m.context_window / 1e3) + "k" : "N/A"} [ by ${m.owned_by}]`,
      provider: this.name,
      maxTokenAllowed: m.context_window || 8e3
    }));
  }
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "GROQ_API_KEY"
    });
    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }
    const openai = createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey
    });
    return openai(model);
  }
}

class HuggingFaceProvider extends BaseProvider {
  name = "HuggingFace";
  getApiKeyLink = "https://huggingface.co/settings/tokens";
  config = {
    apiTokenKey: "HuggingFace_API_KEY"
  };
  staticModels = [
    {
      name: "Qwen/Qwen2.5-Coder-32B-Instruct",
      label: "Qwen2.5-Coder-32B-Instruct (HuggingFace)",
      provider: "HuggingFace",
      maxTokenAllowed: 8e3
    },
    {
      name: "01-ai/Yi-1.5-34B-Chat",
      label: "Yi-1.5-34B-Chat (HuggingFace)",
      provider: "HuggingFace",
      maxTokenAllowed: 8e3
    },
    {
      name: "codellama/CodeLlama-34b-Instruct-hf",
      label: "CodeLlama-34b-Instruct (HuggingFace)",
      provider: "HuggingFace",
      maxTokenAllowed: 8e3
    },
    {
      name: "NousResearch/Hermes-3-Llama-3.1-8B",
      label: "Hermes-3-Llama-3.1-8B (HuggingFace)",
      provider: "HuggingFace",
      maxTokenAllowed: 8e3
    },
    {
      name: "Qwen/Qwen2.5-Coder-32B-Instruct",
      label: "Qwen2.5-Coder-32B-Instruct (HuggingFace)",
      provider: "HuggingFace",
      maxTokenAllowed: 8e3
    },
    {
      name: "Qwen/Qwen2.5-72B-Instruct",
      label: "Qwen2.5-72B-Instruct (HuggingFace)",
      provider: "HuggingFace",
      maxTokenAllowed: 8e3
    },
    {
      name: "meta-llama/Llama-3.1-70B-Instruct",
      label: "Llama-3.1-70B-Instruct (HuggingFace)",
      provider: "HuggingFace",
      maxTokenAllowed: 8e3
    },
    {
      name: "meta-llama/Llama-3.1-405B",
      label: "Llama-3.1-405B (HuggingFace)",
      provider: "HuggingFace",
      maxTokenAllowed: 8e3
    },
    {
      name: "01-ai/Yi-1.5-34B-Chat",
      label: "Yi-1.5-34B-Chat (HuggingFace)",
      provider: "HuggingFace",
      maxTokenAllowed: 8e3
    },
    {
      name: "codellama/CodeLlama-34b-Instruct-hf",
      label: "CodeLlama-34b-Instruct (HuggingFace)",
      provider: "HuggingFace",
      maxTokenAllowed: 8e3
    },
    {
      name: "NousResearch/Hermes-3-Llama-3.1-8B",
      label: "Hermes-3-Llama-3.1-8B (HuggingFace)",
      provider: "HuggingFace",
      maxTokenAllowed: 8e3
    }
  ];
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "HuggingFace_API_KEY"
    });
    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }
    const openai = createOpenAI({
      baseURL: "https://api-inference.huggingface.co/v1/",
      apiKey
    });
    return openai(model);
  }
}

class LMStudioProvider extends BaseProvider {
  name = "LMStudio";
  getApiKeyLink = "https://lmstudio.ai/";
  labelForGetApiKey = "Get LMStudio";
  icon = "i-ph:cloud-arrow-down";
  config = {
    baseUrlKey: "LMSTUDIO_API_BASE_URL",
    baseUrl: "http://localhost:1234/"
  };
  staticModels = [];
  async getDynamicModels(apiKeys, settings, serverEnv = {}) {
    let { baseUrl } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: "LMSTUDIO_API_BASE_URL",
      defaultApiTokenKey: ""
    });
    if (!baseUrl) {
      throw new Error("No baseUrl found for LMStudio provider");
    }
    if (typeof window === "undefined") {
      const isDocker = process?.env?.RUNNING_IN_DOCKER === "true" || serverEnv?.RUNNING_IN_DOCKER === "true";
      baseUrl = isDocker ? baseUrl.replace("localhost", "host.docker.internal") : baseUrl;
      baseUrl = isDocker ? baseUrl.replace("127.0.0.1", "host.docker.internal") : baseUrl;
    }
    const response = await fetch(`${baseUrl}/v1/models`);
    const data = await response.json();
    return data.data.map((model) => ({
      name: model.id,
      label: model.id,
      provider: this.name,
      maxTokenAllowed: 8e3
    }));
  }
  getModelInstance = (options) => {
    const { apiKeys, providerSettings, serverEnv, model } = options;
    let { baseUrl } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "LMSTUDIO_API_BASE_URL",
      defaultApiTokenKey: ""
    });
    if (!baseUrl) {
      throw new Error("No baseUrl found for LMStudio provider");
    }
    const isDocker = process?.env?.RUNNING_IN_DOCKER === "true" || serverEnv?.RUNNING_IN_DOCKER === "true";
    if (typeof window === "undefined") {
      baseUrl = isDocker ? baseUrl.replace("localhost", "host.docker.internal") : baseUrl;
      baseUrl = isDocker ? baseUrl.replace("127.0.0.1", "host.docker.internal") : baseUrl;
    }
    logger$g.debug("LMStudio Base Url used: ", baseUrl);
    const lmstudio = createOpenAI({
      baseURL: `${baseUrl}/v1`,
      apiKey: ""
    });
    return lmstudio(model);
  };
}

class MistralProvider extends BaseProvider {
  name = "Mistral";
  getApiKeyLink = "https://console.mistral.ai/api-keys/";
  config = {
    apiTokenKey: "MISTRAL_API_KEY"
  };
  staticModels = [
    { name: "open-mistral-7b", label: "Mistral 7B", provider: "Mistral", maxTokenAllowed: 8e3 },
    { name: "open-mixtral-8x7b", label: "Mistral 8x7B", provider: "Mistral", maxTokenAllowed: 8e3 },
    { name: "open-mixtral-8x22b", label: "Mistral 8x22B", provider: "Mistral", maxTokenAllowed: 8e3 },
    { name: "open-codestral-mamba", label: "Codestral Mamba", provider: "Mistral", maxTokenAllowed: 8e3 },
    { name: "open-mistral-nemo", label: "Mistral Nemo", provider: "Mistral", maxTokenAllowed: 8e3 },
    { name: "ministral-8b-latest", label: "Mistral 8B", provider: "Mistral", maxTokenAllowed: 8e3 },
    { name: "mistral-small-latest", label: "Mistral Small", provider: "Mistral", maxTokenAllowed: 8e3 },
    { name: "codestral-latest", label: "Codestral", provider: "Mistral", maxTokenAllowed: 8e3 },
    { name: "mistral-large-latest", label: "Mistral Large Latest", provider: "Mistral", maxTokenAllowed: 8e3 }
  ];
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "MISTRAL_API_KEY"
    });
    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }
    const mistral = createMistral({
      apiKey
    });
    return mistral(model);
  }
}

class OllamaProvider extends BaseProvider {
  name = "Ollama";
  getApiKeyLink = "https://ollama.com/download";
  labelForGetApiKey = "Download Ollama";
  icon = "i-ph:cloud-arrow-down";
  config = {
    baseUrlKey: "OLLAMA_API_BASE_URL"
  };
  staticModels = [];
  _convertEnvToRecord(env) {
    if (!env) {
      return {};
    }
    return Object.entries(env).reduce(
      (acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      },
      {}
    );
  }
  getDefaultNumCtx(serverEnv) {
    const envRecord = this._convertEnvToRecord(serverEnv);
    return envRecord.DEFAULT_NUM_CTX ? parseInt(envRecord.DEFAULT_NUM_CTX, 10) : 32768;
  }
  async getDynamicModels(apiKeys, settings, serverEnv = {}) {
    let { baseUrl } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: "OLLAMA_API_BASE_URL",
      defaultApiTokenKey: ""
    });
    if (!baseUrl) {
      throw new Error("No baseUrl found for OLLAMA provider");
    }
    if (typeof window === "undefined") {
      const isDocker = process?.env?.RUNNING_IN_DOCKER === "true" || serverEnv?.RUNNING_IN_DOCKER === "true";
      baseUrl = isDocker ? baseUrl.replace("localhost", "host.docker.internal") : baseUrl;
      baseUrl = isDocker ? baseUrl.replace("127.0.0.1", "host.docker.internal") : baseUrl;
    }
    const response = await fetch(`${baseUrl}/api/tags`);
    const data = await response.json();
    return data.models.map((model) => ({
      name: model.name,
      label: `${model.name} (${model.details.parameter_size})`,
      provider: this.name,
      maxTokenAllowed: 8e3
    }));
  }
  getModelInstance = (options) => {
    const { apiKeys, providerSettings, serverEnv, model } = options;
    const envRecord = this._convertEnvToRecord(serverEnv);
    let { baseUrl } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: envRecord,
      defaultBaseUrlKey: "OLLAMA_API_BASE_URL",
      defaultApiTokenKey: ""
    });
    if (!baseUrl) {
      throw new Error("No baseUrl found for OLLAMA provider");
    }
    const isDocker = process?.env?.RUNNING_IN_DOCKER === "true" || envRecord.RUNNING_IN_DOCKER === "true";
    baseUrl = isDocker ? baseUrl.replace("localhost", "host.docker.internal") : baseUrl;
    baseUrl = isDocker ? baseUrl.replace("127.0.0.1", "host.docker.internal") : baseUrl;
    logger$g.debug("Ollama Base Url used: ", baseUrl);
    const ollamaInstance = ollama(model, {
      numCtx: this.getDefaultNumCtx(serverEnv)
    });
    ollamaInstance.config.baseURL = `${baseUrl}/api`;
    return ollamaInstance;
  };
}

class OpenRouterProvider extends BaseProvider {
  name = "OpenRouter";
  getApiKeyLink = "https://openrouter.ai/settings/keys";
  config = {
    apiTokenKey: "OPEN_ROUTER_API_KEY"
  };
  staticModels = [
    {
      name: "anthropic/claude-3.5-sonnet",
      label: "Anthropic: Claude 3.5 Sonnet (OpenRouter)",
      provider: "OpenRouter",
      maxTokenAllowed: 8e3
    },
    {
      name: "anthropic/claude-3-haiku",
      label: "Anthropic: Claude 3 Haiku (OpenRouter)",
      provider: "OpenRouter",
      maxTokenAllowed: 8e3
    },
    {
      name: "deepseek/deepseek-coder",
      label: "Deepseek-Coder V2 236B (OpenRouter)",
      provider: "OpenRouter",
      maxTokenAllowed: 8e3
    },
    {
      name: "google/gemini-flash-1.5",
      label: "Google Gemini Flash 1.5 (OpenRouter)",
      provider: "OpenRouter",
      maxTokenAllowed: 8e3
    },
    {
      name: "google/gemini-pro-1.5",
      label: "Google Gemini Pro 1.5 (OpenRouter)",
      provider: "OpenRouter",
      maxTokenAllowed: 8e3
    },
    { name: "x-ai/grok-beta", label: "xAI Grok Beta (OpenRouter)", provider: "OpenRouter", maxTokenAllowed: 8e3 },
    {
      name: "mistralai/mistral-nemo",
      label: "OpenRouter Mistral Nemo (OpenRouter)",
      provider: "OpenRouter",
      maxTokenAllowed: 8e3
    },
    {
      name: "qwen/qwen-110b-chat",
      label: "OpenRouter Qwen 110b Chat (OpenRouter)",
      provider: "OpenRouter",
      maxTokenAllowed: 8e3
    },
    { name: "cohere/command", label: "Cohere Command (OpenRouter)", provider: "OpenRouter", maxTokenAllowed: 4096 }
  ];
  async getDynamicModels(_apiKeys, _settings, _serverEnv = {}) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      return data.data.sort((a, b) => a.name.localeCompare(b.name)).map((m) => ({
        name: m.id,
        label: `${m.name} - in:$${(m.pricing.prompt * 1e6).toFixed(2)} out:$${(m.pricing.completion * 1e6).toFixed(2)} - context ${Math.floor(m.context_length / 1e3)}k`,
        provider: this.name,
        maxTokenAllowed: 8e3
      }));
    } catch (error) {
      console.error("Error getting OpenRouter models:", error);
      return [];
    }
  }
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "OPEN_ROUTER_API_KEY"
    });
    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }
    const openRouter = createOpenRouter({
      apiKey
    });
    const instance = openRouter.chat(model);
    return instance;
  }
}

class OpenAILikeProvider extends BaseProvider {
  name = "OpenAILike";
  getApiKeyLink = void 0;
  config = {
    baseUrlKey: "OPENAI_LIKE_API_BASE_URL",
    apiTokenKey: "OPENAI_LIKE_API_KEY"
  };
  staticModels = [];
  async getDynamicModels(apiKeys, settings, serverEnv = {}) {
    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: "OPENAI_LIKE_API_BASE_URL",
      defaultApiTokenKey: "OPENAI_LIKE_API_KEY"
    });
    if (!baseUrl || !apiKey) {
      return [];
    }
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    const res = await response.json();
    return res.data.map((model) => ({
      name: model.id,
      label: model.id,
      provider: this.name,
      maxTokenAllowed: 8e3
    }));
  }
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "OPENAI_LIKE_API_BASE_URL",
      defaultApiTokenKey: "OPENAI_LIKE_API_KEY"
    });
    if (!baseUrl || !apiKey) {
      throw new Error(`Missing configuration for ${this.name} provider`);
    }
    return getOpenAILikeModel(baseUrl, apiKey, model);
  }
}

class OpenAIProvider extends BaseProvider {
  name = "OpenAI";
  getApiKeyLink = "https://platform.openai.com/api-keys";
  config = {
    apiTokenKey: "OPENAI_API_KEY"
  };
  staticModels = [
    { name: "gpt-4o", label: "GPT-4o", provider: "OpenAI", maxTokenAllowed: 8e3 },
    { name: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI", maxTokenAllowed: 8e3 },
    { name: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "OpenAI", maxTokenAllowed: 8e3 },
    { name: "gpt-4", label: "GPT-4", provider: "OpenAI", maxTokenAllowed: 8e3 },
    { name: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", provider: "OpenAI", maxTokenAllowed: 8e3 }
  ];
  async getDynamicModels(apiKeys, settings, serverEnv) {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "OPENAI_API_KEY"
    });
    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }
    const response = await fetch(`https://api.openai.com/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    const res = await response.json();
    const staticModelIds = this.staticModels.map((m) => m.name);
    const data = res.data.filter(
      (model) => model.object === "model" && (model.id.startsWith("gpt-") || model.id.startsWith("o") || model.id.startsWith("chatgpt-")) && !staticModelIds.includes(model.id)
    );
    return data.map((m) => ({
      name: m.id,
      label: `${m.id}`,
      provider: this.name,
      maxTokenAllowed: m.context_window || 32e3
    }));
  }
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "OPENAI_API_KEY"
    });
    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }
    const openai = createOpenAI({
      apiKey,
      // 'strict' sends stream_options.include_usage so streaming responses report token usage
      compatibility: "strict"
    });
    return openai(model);
  }
}

class PerplexityProvider extends BaseProvider {
  name = "Perplexity";
  getApiKeyLink = "https://www.perplexity.ai/settings/api";
  config = {
    apiTokenKey: "PERPLEXITY_API_KEY"
  };
  staticModels = [
    {
      name: "llama-3.1-sonar-small-128k-online",
      label: "Sonar Small Online",
      provider: "Perplexity",
      maxTokenAllowed: 8192
    },
    {
      name: "llama-3.1-sonar-large-128k-online",
      label: "Sonar Large Online",
      provider: "Perplexity",
      maxTokenAllowed: 8192
    },
    {
      name: "llama-3.1-sonar-huge-128k-online",
      label: "Sonar Huge Online",
      provider: "Perplexity",
      maxTokenAllowed: 8192
    }
  ];
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "PERPLEXITY_API_KEY"
    });
    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }
    const perplexity = createOpenAI({
      baseURL: "https://api.perplexity.ai/",
      apiKey
    });
    return perplexity(model);
  }
}

class TogetherProvider extends BaseProvider {
  name = "Together";
  getApiKeyLink = "https://api.together.xyz/settings/api-keys";
  config = {
    baseUrlKey: "TOGETHER_API_BASE_URL",
    apiTokenKey: "TOGETHER_API_KEY"
  };
  staticModels = [
    {
      name: "Qwen/Qwen2.5-Coder-32B-Instruct",
      label: "Qwen/Qwen2.5-Coder-32B-Instruct",
      provider: "Together",
      maxTokenAllowed: 8e3
    },
    {
      name: "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
      label: "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
      provider: "Together",
      maxTokenAllowed: 8e3
    },
    {
      name: "mistralai/Mixtral-8x7B-Instruct-v0.1",
      label: "Mixtral 8x7B Instruct",
      provider: "Together",
      maxTokenAllowed: 8192
    }
  ];
  async getDynamicModels(apiKeys, settings, serverEnv = {}) {
    const { baseUrl: fetchBaseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: "TOGETHER_API_BASE_URL",
      defaultApiTokenKey: "TOGETHER_API_KEY"
    });
    const baseUrl = fetchBaseUrl || "https://api.together.xyz/v1";
    if (!apiKey) {
      return [];
    }
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    const res = await response.json();
    const data = (res || []).filter((model) => model.type === "chat");
    return data.map((m) => ({
      name: m.id,
      label: `${m.display_name} - in:$${m.pricing.input.toFixed(2)} out:$${m.pricing.output.toFixed(2)} - context ${Math.floor(m.context_length / 1e3)}k`,
      provider: this.name,
      maxTokenAllowed: 8e3
    }));
  }
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "TOGETHER_API_BASE_URL",
      defaultApiTokenKey: "TOGETHER_API_KEY"
    });
    if (!baseUrl || !apiKey) {
      throw new Error(`Missing configuration for ${this.name} provider`);
    }
    return getOpenAILikeModel(baseUrl, apiKey, model);
  }
}

class XAIProvider extends BaseProvider {
  name = "xAI";
  getApiKeyLink = "https://docs.x.ai/docs/quickstart#creating-an-api-key";
  config = {
    apiTokenKey: "XAI_API_KEY"
  };
  staticModels = [
    { name: "grok-3-beta", label: "xAI Grok 3 Beta", provider: "xAI", maxTokenAllowed: 8e3 },
    { name: "grok-beta", label: "xAI Grok Beta", provider: "xAI", maxTokenAllowed: 8e3 },
    { name: "grok-2-1212", label: "xAI Grok2 1212", provider: "xAI", maxTokenAllowed: 8e3 }
  ];
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "XAI_API_KEY"
    });
    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }
    const openai = createOpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey
    });
    return openai(model);
  }
}

class HyperbolicProvider extends BaseProvider {
  name = "Hyperbolic";
  getApiKeyLink = "https://app.hyperbolic.xyz/settings";
  config = {
    apiTokenKey: "HYPERBOLIC_API_KEY"
  };
  staticModels = [
    {
      name: "Qwen/Qwen2.5-Coder-32B-Instruct",
      label: "Qwen 2.5 Coder 32B Instruct",
      provider: "Hyperbolic",
      maxTokenAllowed: 8192
    },
    {
      name: "Qwen/Qwen2.5-72B-Instruct",
      label: "Qwen2.5-72B-Instruct",
      provider: "Hyperbolic",
      maxTokenAllowed: 8192
    },
    {
      name: "deepseek-ai/DeepSeek-V2.5",
      label: "DeepSeek-V2.5",
      provider: "Hyperbolic",
      maxTokenAllowed: 8192
    },
    {
      name: "Qwen/QwQ-32B-Preview",
      label: "QwQ-32B-Preview",
      provider: "Hyperbolic",
      maxTokenAllowed: 8192
    },
    {
      name: "Qwen/Qwen2-VL-72B-Instruct",
      label: "Qwen2-VL-72B-Instruct",
      provider: "Hyperbolic",
      maxTokenAllowed: 8192
    }
  ];
  async getDynamicModels(apiKeys, settings, serverEnv = {}) {
    const { baseUrl: fetchBaseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "HYPERBOLIC_API_KEY"
    });
    const baseUrl = fetchBaseUrl || "https://api.hyperbolic.xyz/v1";
    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    const res = await response.json();
    const data = res.data.filter((model) => model.object === "model" && model.supports_chat);
    return data.map((m) => ({
      name: m.id,
      label: `${m.id} - context ${m.context_length ? Math.floor(m.context_length / 1e3) + "k" : "N/A"}`,
      provider: this.name,
      maxTokenAllowed: m.context_length || 8e3
    }));
  }
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "HYPERBOLIC_API_KEY"
    });
    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }
    const openai = createOpenAI({
      baseURL: "https://api.hyperbolic.xyz/v1/",
      apiKey
    });
    return openai(model);
  }
}

class AmazonBedrockProvider extends BaseProvider {
  name = "AmazonBedrock";
  getApiKeyLink = "https://console.aws.amazon.com/iam/home";
  config = {
    apiTokenKey: "AWS_BEDROCK_CONFIG"
  };
  staticModels = [
    {
      name: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      label: "Claude 3.5 Sonnet v2 (Bedrock)",
      provider: "AmazonBedrock",
      maxTokenAllowed: 2e5
    },
    {
      name: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      label: "Claude 3.5 Sonnet (Bedrock)",
      provider: "AmazonBedrock",
      maxTokenAllowed: 4096
    },
    {
      name: "anthropic.claude-3-sonnet-20240229-v1:0",
      label: "Claude 3 Sonnet (Bedrock)",
      provider: "AmazonBedrock",
      maxTokenAllowed: 4096
    },
    {
      name: "anthropic.claude-3-haiku-20240307-v1:0",
      label: "Claude 3 Haiku (Bedrock)",
      provider: "AmazonBedrock",
      maxTokenAllowed: 4096
    },
    {
      name: "amazon.nova-pro-v1:0",
      label: "Amazon Nova Pro (Bedrock)",
      provider: "AmazonBedrock",
      maxTokenAllowed: 5120
    },
    {
      name: "amazon.nova-lite-v1:0",
      label: "Amazon Nova Lite (Bedrock)",
      provider: "AmazonBedrock",
      maxTokenAllowed: 5120
    },
    {
      name: "mistral.mistral-large-2402-v1:0",
      label: "Mistral Large 24.02 (Bedrock)",
      provider: "AmazonBedrock",
      maxTokenAllowed: 8192
    }
  ];
  _parseAndValidateConfig(apiKey) {
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(apiKey);
    } catch {
      throw new Error(
        "Invalid AWS Bedrock configuration format. Please provide a valid JSON string containing region, accessKeyId, and secretAccessKey."
      );
    }
    const { region, accessKeyId, secretAccessKey, sessionToken } = parsedConfig;
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing required AWS credentials. Configuration must include region, accessKeyId, and secretAccessKey."
      );
    }
    return {
      region,
      accessKeyId,
      secretAccessKey,
      ...sessionToken && { sessionToken }
    };
  }
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "AWS_BEDROCK_CONFIG"
    });
    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }
    const config = this._parseAndValidateConfig(apiKey);
    const bedrock = createAmazonBedrock(config);
    return bedrock(model);
  }
}

class GithubProvider extends BaseProvider {
  name = "Github";
  getApiKeyLink = "https://github.com/settings/personal-access-tokens";
  config = {
    apiTokenKey: "GITHUB_API_KEY"
  };
  // find more in https://github.com/marketplace?type=models
  staticModels = [
    { name: "gpt-4o", label: "GPT-4o", provider: "Github", maxTokenAllowed: 8e3 },
    { name: "o1", label: "o1-preview", provider: "Github", maxTokenAllowed: 1e5 },
    { name: "o1-mini", label: "o1-mini", provider: "Github", maxTokenAllowed: 8e3 },
    { name: "gpt-4o-mini", label: "GPT-4o Mini", provider: "Github", maxTokenAllowed: 8e3 },
    { name: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "Github", maxTokenAllowed: 8e3 },
    { name: "gpt-4", label: "GPT-4", provider: "Github", maxTokenAllowed: 8e3 },
    { name: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", provider: "Github", maxTokenAllowed: 8e3 }
  ];
  getModelInstance(options) {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: "",
      defaultApiTokenKey: "GITHUB_API_KEY"
    });
    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }
    const openai = createOpenAI({
      baseURL: "https://models.inference.ai.azure.com",
      apiKey
    });
    return openai(model);
  }
}

const providers = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  AmazonBedrockProvider,
  AnthropicProvider,
  CohereProvider,
  DeepseekProvider,
  GithubProvider,
  GoogleProvider,
  GroqProvider,
  HuggingFaceProvider,
  HyperbolicProvider,
  LMStudioProvider,
  MistralProvider,
  OllamaProvider,
  OpenAILikeProvider,
  OpenAIProvider,
  OpenRouterProvider,
  PerplexityProvider,
  TogetherProvider,
  XAIProvider
}, Symbol.toStringTag, { value: 'Module' }));

const logger$e = createScopedLogger("LLMManager");
class LLMManager {
  static _instance;
  _providers = /* @__PURE__ */ new Map();
  _modelList = [];
  _env = {};
  constructor(_env) {
    this._registerProvidersFromDirectory();
    this._env = _env;
  }
  static getInstance(env = {}) {
    if (!LLMManager._instance) {
      LLMManager._instance = new LLMManager(env);
    }
    return LLMManager._instance;
  }
  get env() {
    return this._env;
  }
  async _registerProvidersFromDirectory() {
    try {
      for (const exportedItem of Object.values(providers)) {
        if (typeof exportedItem === "function" && exportedItem.prototype instanceof BaseProvider) {
          const provider = new exportedItem();
          try {
            this.registerProvider(provider);
          } catch (error) {
            logger$e.warn("Failed To Register Provider: ", provider.name, "error:", error.message);
          }
        }
      }
    } catch (error) {
      logger$e.error("Error registering providers:", error);
    }
  }
  registerProvider(provider) {
    if (this._providers.has(provider.name)) {
      logger$e.warn(`Provider ${provider.name} is already registered. Skipping.`);
      return;
    }
    logger$e.info("Registering Provider: ", provider.name);
    this._providers.set(provider.name, provider);
    this._modelList = [...this._modelList, ...provider.staticModels];
  }
  getProvider(name) {
    return this._providers.get(name);
  }
  getAllProviders() {
    return Array.from(this._providers.values());
  }
  getModelList() {
    return this._modelList;
  }
  async updateModelList(options) {
    const { apiKeys, providerSettings, serverEnv } = options;
    let enabledProviders = Array.from(this._providers.values()).map((p) => p.name);
    if (providerSettings && Object.keys(providerSettings).length > 0) {
      enabledProviders = enabledProviders.filter((p) => providerSettings[p].enabled);
    }
    const dynamicModels = await Promise.all(
      Array.from(this._providers.values()).filter((provider) => enabledProviders.includes(provider.name)).filter(
        (provider) => !!provider.getDynamicModels
      ).map(async (provider) => {
        const cachedModels = provider.getModelsFromCache(options);
        if (cachedModels) {
          return cachedModels;
        }
        const dynamicModels2 = await provider.getDynamicModels(apiKeys, providerSettings?.[provider.name], serverEnv).then((models) => {
          logger$e.info(`Caching ${models.length} dynamic models for ${provider.name}`);
          provider.storeDynamicModels(options, models);
          return models;
        }).catch((err) => {
          logger$e.error(`Error getting dynamic models ${provider.name} :`, err);
          return [];
        });
        return dynamicModels2;
      })
    );
    const staticModels = Array.from(this._providers.values()).flatMap((p) => p.staticModels || []);
    const dynamicModelsFlat = dynamicModels.flat();
    const dynamicModelKeys = dynamicModelsFlat.map((d) => `${d.name}-${d.provider}`);
    const filteredStaticModesl = staticModels.filter((m) => !dynamicModelKeys.includes(`${m.name}-${m.provider}`));
    const modelList = [...dynamicModelsFlat, ...filteredStaticModesl];
    modelList.sort((a, b) => a.name.localeCompare(b.name));
    this._modelList = modelList;
    return modelList;
  }
  getStaticModelList() {
    return [...this._providers.values()].flatMap((p) => p.staticModels || []);
  }
  async getModelListFromProvider(providerArg, options) {
    const provider = this._providers.get(providerArg.name);
    if (!provider) {
      throw new Error(`Provider ${providerArg.name} not found`);
    }
    const staticModels = provider.staticModels || [];
    if (!provider.getDynamicModels) {
      return staticModels;
    }
    const { apiKeys, providerSettings, serverEnv } = options;
    const cachedModels = provider.getModelsFromCache({
      apiKeys,
      providerSettings,
      serverEnv
    });
    if (cachedModels) {
      logger$e.info(`Found ${cachedModels.length} cached models for ${provider.name}`);
      return [...cachedModels, ...staticModels];
    }
    logger$e.info(`Getting dynamic models for ${provider.name}`);
    const dynamicModels = await provider.getDynamicModels?.(apiKeys, providerSettings?.[provider.name], serverEnv).then((models) => {
      logger$e.info(`Got ${models.length} dynamic models for ${provider.name}`);
      provider.storeDynamicModels(options, models);
      return models;
    }).catch((err) => {
      logger$e.error(`Error getting dynamic models ${provider.name} :`, err);
      return [];
    });
    const dynamicModelsName = dynamicModels.map((d) => d.name);
    const filteredStaticList = staticModels.filter((m) => !dynamicModelsName.includes(m.name));
    const modelList = [...dynamicModels, ...filteredStaticList];
    modelList.sort((a, b) => a.name.localeCompare(b.name));
    return modelList;
  }
  getStaticModelListFromProvider(providerArg) {
    const provider = this._providers.get(providerArg.name);
    if (!provider) {
      throw new Error(`Provider ${providerArg.name} not found`);
    }
    return [...provider.staticModels || []];
  }
  getDefaultProvider() {
    const firstProvider = this._providers.values().next().value;
    if (!firstProvider) {
      throw new Error("No providers registered");
    }
    return firstProvider;
  }
}

const __vite_import_meta_env__$1 = {"BASE_URL": "/", "DEV": false, "LMSTUDIO_API_BASE_URL": "", "MODE": "production", "OLLAMA_API_BASE_URL": "", "OPENAI_LIKE_API_BASE_URL": "", "PROD": true, "SSR": true, "TOGETHER_API_BASE_URL": "", "VITE_GITHUB_ACCESS_TOKEN": "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", "VITE_GITHUB_TOKEN_TYPE": "classic", "VITE_LOG_LEVEL": "", "VITE_NETLIFY_ACCESS_TOKEN": "nfp_Ct8Ptp7CmiZfB3Xv4JBtt6atyUVSCd9j3f25", "VITE_VERCEL_ACCESS_TOKEN": "vcp_3VlTOglFCKZkhLZ9UAGoeAR1RaeN4fbzLdnf5NA9CYP1F7wlyz2ZnYqX"};
const WORK_DIR_NAME = "project";
const WORK_DIR = `/home/${WORK_DIR_NAME}`;
const MODIFICATIONS_TAG_NAME = "bolt_file_modifications";
const MODEL_REGEX = /^\[Model: (.*?)\]\n\n/;
const PROVIDER_REGEX = /\[Provider: (.*?)\]\n\n/;
const DEFAULT_MODEL = "claude-3-5-sonnet-latest";
const llmManager = LLMManager.getInstance(__vite_import_meta_env__$1);
const PROVIDER_LIST = llmManager.getAllProviders();
const DEFAULT_PROVIDER = llmManager.getDefaultProvider();
const providerBaseUrlEnvKeys = {};
PROVIDER_LIST.forEach((provider) => {
  providerBaseUrlEnvKeys[provider.name] = {
    baseUrlKey: provider.config.baseUrlKey,
    apiTokenKey: provider.config.apiTokenKey
  };
});
const STARTER_TEMPLATES = [
  {
    name: "Expo App",
    label: "Expo App",
    description: "Expo starter template for building cross-platform mobile apps",
    githubRepo: "xKevIsDev/bolt-expo-template",
    tags: ["mobile", "expo", "mobile-app", "android", "iphone"],
    icon: "i-bolt:expo"
  },
  {
    name: "Basic Astro",
    label: "Astro Basic",
    description: "Lightweight Astro starter template for building fast static websites",
    githubRepo: "xKevIsDev/bolt-astro-basic-template",
    tags: ["astro", "blog", "performance"],
    icon: "i-bolt:astro"
  },
  {
    name: "NextJS Shadcn",
    label: "Next.js with shadcn/ui",
    description: "Next.js starter fullstack template integrated with shadcn/ui components and styling system",
    githubRepo: "xKevIsDev/bolt-nextjs-shadcn-template",
    tags: ["nextjs", "react", "typescript", "shadcn", "tailwind"],
    icon: "i-bolt:nextjs"
  },
  {
    name: "Vite Shadcn",
    label: "Vite with shadcn/ui",
    description: "Vite starter fullstack template integrated with shadcn/ui components and styling system",
    githubRepo: "xKevIsDev/vite-shadcn",
    tags: ["vite", "react", "typescript", "shadcn", "tailwind"],
    icon: "i-bolt:shadcn"
  },
  {
    name: "Qwik Typescript",
    label: "Qwik TypeScript",
    description: "Qwik framework starter with TypeScript for building resumable applications",
    githubRepo: "xKevIsDev/bolt-qwik-ts-template",
    tags: ["qwik", "typescript", "performance", "resumable"],
    icon: "i-bolt:qwik"
  },
  {
    name: "Remix Typescript",
    label: "Remix TypeScript",
    description: "Remix framework starter with TypeScript for full-stack web applications",
    githubRepo: "xKevIsDev/bolt-remix-ts-template",
    tags: ["remix", "typescript", "fullstack", "react"],
    icon: "i-bolt:remix"
  },
  {
    name: "Slidev",
    label: "Slidev Presentation",
    description: "Slidev starter template for creating developer-friendly presentations using Markdown",
    githubRepo: "xKevIsDev/bolt-slidev-template",
    tags: ["slidev", "presentation", "markdown"],
    icon: "i-bolt:slidev"
  },
  {
    name: "Sveltekit",
    label: "SvelteKit",
    description: "SvelteKit starter template for building fast, efficient web applications",
    githubRepo: "bolt-sveltekit-template",
    tags: ["svelte", "sveltekit", "typescript"],
    icon: "i-bolt:svelte"
  },
  {
    name: "Vanilla Vite",
    label: "Vanilla + Vite",
    description: "Minimal Vite starter template for vanilla JavaScript projects",
    githubRepo: "xKevIsDev/vanilla-vite-template",
    tags: ["vite", "vanilla-js", "minimal"],
    icon: "i-bolt:vite"
  },
  {
    name: "Vite React",
    label: "React + Vite + typescript",
    description: "React starter template powered by Vite for fast development experience",
    githubRepo: "xKevIsDev/bolt-vite-react-ts-template",
    tags: ["react", "vite", "frontend", "website", "app"],
    icon: "i-bolt:react"
  },
  {
    name: "Vite Typescript",
    label: "Vite + TypeScript",
    description: "Vite starter template with TypeScript configuration for type-safe development",
    githubRepo: "xKevIsDev/bolt-vite-ts-template",
    tags: ["vite", "typescript", "minimal"],
    icon: "i-bolt:typescript"
  },
  {
    name: "Vue",
    label: "Vue.js",
    description: "Vue.js starter template with modern tooling and best practices",
    githubRepo: "xKevIsDev/bolt-vue-template",
    tags: ["vue", "typescript", "frontend"],
    icon: "i-bolt:vue"
  },
  {
    name: "Angular",
    label: "Angular Starter",
    description: "A modern Angular starter template with TypeScript support and best practices configuration",
    githubRepo: "xKevIsDev/bolt-angular-template",
    tags: ["angular", "typescript", "frontend", "spa"],
    icon: "i-bolt:angular"
  }
];

const allowedHTMLElements = [
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "dd",
  "del",
  "details",
  "div",
  "dl",
  "dt",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "ins",
  "kbd",
  "li",
  "ol",
  "p",
  "pre",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "source",
  "span",
  "strike",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
  "var",
  "think"
];
({
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...defaultSchema.attributes?.div ?? [],
      "data*",
      ["className", "__boltArtifact__", "__boltThought__"]
      // ['className', '__boltThought__']
    ]
  }});

const uiUxDesignSkill = {
  name: "ui-ux-design",
  description: "Professional UI/UX design system: accessibility, typography, color, layout, icons, style selection by product type. Use for ANY request that creates or visually changes a website, app, page, or component.",
  triggers: /\b(design|redesign|ui|ux|style|styling|theme|color|colour|font|typography|layout|landing|website|webpage|web page|homepage|home page|dashboard|portfolio|navbar|header|hero|footer|responsive|dark mode|light mode|glassmorphism|animation|animate|beautiful|modern|page|saas|ecommerce|e-commerce|blog)\b/,
  defaultOnFirstMessage: true,
  body: () => `
<ui_ux_design_intelligence>
  You have access to a professional UI/UX design system. Apply these principles AUTOMATICALLY whenever you build any website, landing page, dashboard, or UI component — no need for the user to ask.

  ## Priority Framework (apply in this order)

  1. **Accessibility (CRITICAL)** — minimum 4.5:1 color contrast, visible focus rings, descriptive alt text, aria-labels on icon-only buttons, tab order matches visual order, form labels with \`for\` attribute
  2. **Touch & Interaction (CRITICAL)** — minimum 44×44px touch targets, disable buttons during async ops, clear error messages near the problem, \`cursor-pointer\` on ALL clickable/hoverable elements
  3. **Performance (HIGH)** — WebP images with srcset + lazy loading, respect \`prefers-reduced-motion\`, reserve space for async content to prevent layout shift
  4. **Layout & Responsive (HIGH)** — \`viewport\` meta tag, minimum 16px body text on mobile, no horizontal scroll, z-index scale (10, 20, 30, 50)
  5. **Typography & Color (MEDIUM)** — line-height 1.5–1.75 for body, 65–75 characters per line max, match heading/body font personalities
  6. **Animation (MEDIUM)** — 150–300ms for micro-interactions, use \`transform\`/\`opacity\` not \`width\`/\`height\`, skeleton screens for loading states; use Framer Motion or GSAP for scroll-driven animations on websites
  7. **Style Selection (MEDIUM)** — match style to product type, consistent style across all pages

  ## Professional UI Rules (non-negotiable)

  ### Icons
  - NEVER use emojis as UI icons — always use SVG icon libraries (Heroicons, Lucide, Phosphor Icons)
  - Use consistent icon sizing with fixed viewBox (24×24) and \`w-6 h-6\` class
  - Research correct brand logos from Simple Icons — never guess paths

  ### Interaction
  - Add \`cursor-pointer\` to ALL clickable cards, buttons, links, and interactive elements
  - Hover states: use color/opacity transitions, NOT scale transforms that shift layout
  - Transitions: \`transition-colors duration-200\` for most hover effects

  ### Light/Dark Mode Contrast
  - Glass cards in light mode: use \`bg-white/80\` or higher opacity (NOT \`bg-white/10\`)
  - Body text in light mode: use \`#0F172A\` (slate-900), never \`#94A3B8\` (slate-400)
  - Muted text: minimum \`#475569\` (slate-600)
  - Borders in light mode: use \`border-gray-200\` (NOT \`border-white/10\` — it's invisible)

  ### Layout
  - Floating navbars: add \`top-4 left-4 right-4\` spacing (NOT \`top-0 left-0 right-0\`)
  - Always account for fixed navbar height in content padding
  - Use consistent container width: \`max-w-6xl\` or \`max-w-7xl\` throughout

  ## Font Pairing Recommendations

  Choose based on brand personality:
  - **Professional/Corporate**: Inter (headings) + Inter (body) — clean, neutral
  - **Elegant/Luxury**: Playfair Display (headings) + Lato (body) — contrast serif/sans
  - **Modern SaaS**: Plus Jakarta Sans (headings) + Plus Jakarta Sans (body) — geometric
  - **Creative/Portfolio**: Sora (headings) + Sora (body) — distinctive, contemporary
  - **Friendly/Startup**: Nunito (headings) + Nunito Sans (body) — rounded, approachable
  - **Editorial/Blog**: Merriweather (headings) + Source Sans 3 (body) — readable long-form
  - **Bold/Impactful**: Oswald (headings) + Open Sans (body) — high contrast weight

  ## UI Style Selection by Product Type

  Match the visual style to the product:
  - **SaaS / Dashboard**: Minimalism or Dark Mode OLED — clean data hierarchy
  - **Landing Pages**: Hero-Centric or Conversion-Optimized — clear CTAs, social proof
  - **Portfolio / Creative**: Brutalism or Motion-Driven — personality-forward
  - **E-commerce**: Feature-Rich Showcase or Trust & Authority — product focus
  - **Healthcare / Finance**: Accessible or Flat — trust, clarity, legibility
  - **Startup / Tech**: Glassmorphism or Aurora — modern, forward-looking
  - **Restaurant / Service**: Storytelling-Driven — atmosphere and emotion

  ## Scroll Animations (REQUIRED for websites & landing pages)

  EVERY website or landing page you generate MUST include rich scroll-driven animations. This is non-negotiable — a static page with no motion is unprofessional.

  ### Library Choice
  - **React / Next.js projects** → use **Framer Motion** (\`framer-motion\` package)
  - **Plain HTML / Tailwind / Vanilla JS** → use **GSAP** with \`ScrollTrigger\` plugin
  - Both libraries must be installed as dependencies in \`package.json\`

  ### Required Framer Motion Patterns (React)

  \`\`\`tsx
  // 1. Fade-up on scroll (use for sections, cards, headings)
  import { motion } from 'framer-motion';
  import { useInView } from 'framer-motion';

  const fadeUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  // 2. Stagger children (use for grids, feature lists, testimonials)
  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } }
  };

  // 3. Parallax hero (use for hero sections)
  import { useScroll, useTransform } from 'framer-motion';
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, -150]);

  // 4. Scale + fade (use for feature cards, stats)
  const scaleIn = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'backOut' } }
  };

  // 5. Slide in from sides (use for alternating content sections)
  const slideLeft  = { hidden: { opacity: 0, x: -80 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7 } } };
  const slideRight = { hidden: { opacity: 0, x:  80 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7 } } };
  \`\`\`

  ### Required GSAP + ScrollTrigger Patterns (HTML/Vanilla)

  \`\`\`js
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  gsap.registerPlugin(ScrollTrigger);

  // 1. Fade-up sections
  gsap.utils.toArray('.section').forEach(el => {
    gsap.from(el, { opacity: 0, y: 80, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
    });
  });

  // 2. Stagger grid items
  gsap.from('.card', { opacity: 0, y: 50, stagger: 0.1, duration: 0.6,
    scrollTrigger: { trigger: '.grid', start: 'top 80%' }
  });

  // 3. Parallax hero background
  gsap.to('.hero-bg', { yPercent: -30, ease: 'none',
    scrollTrigger: { trigger: '.hero', scrub: true }
  });

  // 4. Horizontal scroll section — correct pattern (no vertical bleed)
  // HTML structure required:
  //   <section class="h-scroll-outer">          <!-- overflow:hidden wrapper -->
  //     <div class="h-scroll-track">            <!-- flex container, width:fit-content -->
  //       <div class="h-panel">…</div>          <!-- each panel: width:100vw, height:100vh -->
  //       <div class="h-panel">…</div>
  //     </div>
  //   </section>
  // CSS required:
  //   .h-scroll-outer { overflow: hidden; }
  //   .h-scroll-track { display: flex; will-change: transform; }
  //   .h-panel { width: 100vw; height: 100vh; flex-shrink: 0; }
  const track = document.querySelector('.h-scroll-track');
  const totalDist = track.scrollWidth - window.innerWidth;
  gsap.to(track, {
    x: -totalDist,
    ease: 'none',
    scrollTrigger: {
      trigger: '.h-scroll-outer',
      start: 'top top',
      end: () => '+=' + totalDist,
      pin: true,
      scrub: 1,
      anticipatePin: 1,          // prevents jitter at pin start
      invalidateOnRefresh: true, // recalculates on window resize
    }
  });

  // 5. Counter animation (stats)
  gsap.from('.stat-number', { textContent: 0, duration: 2, ease: 'power1.out', snap: { textContent: 1 },
    scrollTrigger: { trigger: '.stats', start: 'top 80%' }
  });
  \`\`\`

  ### Horizontal Scroll — Critical Rules (MUST follow, common mistakes cause vertical+horizontal bleed)

  | Rule | Wrong | Correct |
  |------|-------|---------|
  | What you animate | Individual panels with \`xPercent\` | The **track container** with \`x: -totalDist\` |
  | Distance calculation | \`container.offsetWidth\` (visible width) | \`track.scrollWidth - window.innerWidth\` (total travel) |
  | Wrapper CSS | No overflow set | \`overflow: hidden\` on the outer wrapper |
  | Track CSS | Missing flex | \`display: flex; will-change: transform;\` |
  | Panel CSS | Missing shrink | \`width: 100vw; height: 100vh; flex-shrink: 0;\` |
  | Pin target | The track/inner element | The **outer wrapper** (\`trigger: '.h-scroll-outer'\`) |
  | Resize safety | Not handled | \`invalidateOnRefresh: true\` always |
  | Pin jitter | Missing | \`anticipatePin: 1\` always |

  **Mental model**: The user scrolls DOWN — GSAP intercepts that vertical scroll, pins the outer wrapper at \`top: 0\`,
  and converts the scroll distance into leftward (\`x\`) movement of the inner track. The outer wrapper needs
  \`overflow: hidden\` or the track will visibly overflow right. The \`end\` distance MUST equal the track's
  total scrollable width (\`track.scrollWidth - window.innerWidth\`) so the last panel lands exactly flush right.

  ### Animation Strategy per Section

  | Section | Animation |
  |---------|-----------|
  | Hero | Parallax background, text words animate in with stagger, CTA button pops with scale |
  | Features / Services | Staggered fade-up cards on scroll |
  | Stats / Numbers | Counter animation triggered on scroll |
  | Testimonials | Slide-in from sides or carousel with smooth drag |
  | Pricing | Scale-in cards, highlighted plan pulses |
  | CTA Banner | Fade-up heading + slide-up button |
  | Footer | Subtle fade-in columns with stagger |
  | Navbar | Transparent → solid on scroll with backdrop-blur transition |

  ### Rules
  - Wrap entire page sections in \`<motion.section>\` with \`whileInView\` and \`viewport={{ once: true, margin: '-100px' }}\`
  - Use \`once: true\` so animations don't repeat on scroll-back (unless intentional)
  - Always respect \`prefers-reduced-motion\` — wrap animations in a check or use \`useReducedMotion()\` hook
  - Never animate layout properties (width, height, padding, margin) — only \`transform\` and \`opacity\`
  - Keep entrance animations under 800ms; parallax scrubs can be continuous

  ## Pre-Delivery Checklist

  Before delivering ANY UI code, verify:
  - [ ] No emojis used as icons (SVG only)
  - [ ] All clickable elements have \`cursor-pointer\`
  - [ ] Hover states provide visual feedback without layout shift
  - [ ] Light mode text contrast meets 4.5:1 minimum
  - [ ] Glass/transparent elements are visible in light mode
  - [ ] Borders are visible in both light and dark modes
  - [ ] No content hidden behind fixed navbars
  - [ ] Responsive at 375px, 768px, 1024px, 1440px
  - [ ] No horizontal scroll on mobile
  - [ ] All images have alt text
  - [ ] Form inputs have associated labels
  - [ ] Transitions are smooth (150–300ms)
  - [ ] Focus states visible for keyboard navigation
  - [ ] Scroll animations added (Framer Motion or GSAP) — hero parallax, staggered cards, fade-ups
  - [ ] \`prefers-reduced-motion\` respected for all animations
  - [ ] Navbar transitions from transparent to solid on scroll
</ui_ux_design_intelligence>
`
};

const threejs3dSkill = {
  name: "threejs-3d",
  description: "Interactive 3D with Three.js: hero backgrounds, globes, particles, product showcases, shaders.",
  triggers: /\b(3d|three\.?js|webgl|globe|particles?|orbit|shader|wireframe|icosahedron|torus|mesh)\b/,
  body: () => `
<threejs_interactive_3d>
  When the user asks for a 3D element, interactive scene, or any rotating/animated 3D object,
  build it from scratch with Three.js — no external model files, no Sketchfab, no iframes.
  Three.js runs entirely in the browser and produces fully interactive, production-quality 3D.

  ## CDN Import — add inside \`<head>\` (importmap, works in all modern browsers)
  \`\`\`html
  <script type="importmap">
  { "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/"
  } }
  <\/script>
  \`\`\`

  ## Canonical Scene Setup (copy-paste base for every 3D section)
  \`\`\`html
  <canvas id="canvas3d" style="width:100%;height:500px;display:block;border-radius:16px;"></canvas>
  <script type="module">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

  const canvas = document.getElementById('canvas3d');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 2, 6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.5;

  // Responsive resize
  new ResizeObserver(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }).observe(canvas);

  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();
  <\/script>
  \`\`\`

  ## Geometries — all built-in, zero file downloads
  | Geometry | Constructor | Best for |
  |---|---|---|
  | Box | \`new THREE.BoxGeometry(1,1,1)\` | crates, buildings, UI cards |
  | Sphere | \`new THREE.SphereGeometry(1,64,64)\` | planets, orbs, balls |
  | Cylinder | \`new THREE.CylinderGeometry(0.5,0.5,2,32)\` | pillars, cans, tubes |
  | Torus | \`new THREE.TorusGeometry(1,0.3,16,100)\` | rings, donuts, portals |
  | TorusKnot | \`new THREE.TorusKnotGeometry(1,0.3,128,32)\` | abstract hero shapes |
  | Icosahedron | \`new THREE.IcosahedronGeometry(1,1)\` | low-poly gem/diamond |
  | Cone | \`new THREE.ConeGeometry(0.5,1.5,32)\` | arrows, mountains |
  | Plane | \`new THREE.PlaneGeometry(10,10,20,20)\` | floors, water surfaces |
  | Lathe | \`new THREE.LatheGeometry(points,32)\` | vases, bottles, lamps |

  ## Materials — PBR-first
  \`\`\`javascript
  // Standard PBR — use for most objects
  const mat = new THREE.MeshStandardMaterial({
    color: 0x7c6ff7,
    metalness: 0.8,
    roughness: 0.2,
    envMapIntensity: 1,
  });

  // Glowing emissive (neon/sci-fi look)
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.6, roughness: 0.1 });

  // Glass / crystal
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0, ior: 1.5, thickness: 0.5 });

  // Cartoon / cel-shading
  const toonMat = new THREE.MeshToonMaterial({ color: 0xff6b6b });

  // Wireframe overlay
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x7c6ff7, wireframe: true });

  // Custom GLSL shader
  const shaderMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x7c6ff7) } },
    vertexShader: \`
      uniform float uTime;
      void main() {
        vec3 pos = position;
        pos.y += sin(pos.x * 3.0 + uTime) * 0.1;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    \`,
    fragmentShader: \`
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }
    \`,
  });
  // In animate loop: shaderMat.uniforms.uTime.value = clock.getElapsedTime();
  \`\`\`

  ## Lighting Recipes
  \`\`\`javascript
  // Studio setup (clean product showcase)
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(5,8,5); key.castShadow = true; scene.add(key);
  const fill = new THREE.DirectionalLight(0x8888ff, 1); fill.position.set(-5,2,-5); scene.add(fill);

  // Neon / sci-fi (colored point lights)
  scene.add(new THREE.PointLight(0x7c6ff7, 5, 15)); // purple
  scene.add(new THREE.PointLight(0x00ffff, 3, 10)); // cyan accent

  // Environment map (reflective materials)
  import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
  new RGBELoader().load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr', (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr;
  });
  \`\`\`

  ## Animation Patterns
  \`\`\`javascript
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Continuous rotation
    mesh.rotation.y = t * 0.6;

    // Floating up/down
    mesh.position.y = Math.sin(t * 1.2) * 0.3;

    // Breathing scale
    mesh.scale.setScalar(1 + Math.sin(t * 2) * 0.04);

    // Orbit child around parent
    child.position.x = Math.cos(t) * 2;
    child.position.z = Math.sin(t) * 2;

    // Wave a plane geometry
    const pos = plane.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 2 + t) * 0.2 + Math.cos(z * 2 + t) * 0.2);
    }
    pos.needsUpdate = true;

    renderer.render(scene, camera);
  }
  \`\`\`

  ## Mouse-Parallax Camera (no controls library needed)
  \`\`\`javascript
  let mx = 0, my = 0;
  window.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = -(e.clientY / window.innerHeight - 0.5) * 2;
  });
  // In animate loop:
  camera.position.x += (mx * 2 - camera.position.x) * 0.04;
  camera.position.y += (my * 1.5 - camera.position.y) * 0.04;
  camera.lookAt(scene.position);
  \`\`\`

  ## Scroll-Driven 3D Animation

  **Core rule**: GSAP ScrollTrigger cannot tween Three.js objects directly in an idle loop —
  use a **proxy object** that GSAP tweens, then read it inside the \`requestAnimationFrame\` loop.
  Alternatively use \`gsap.ticker\` as the render loop itself.

  ### Pattern A — Proxy scroll progress (works in any setup)
  \`\`\`javascript
  import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js';
  import { ScrollTrigger } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js';
  gsap.registerPlugin(ScrollTrigger);

  // 1. Proxy object — GSAP writes to it, Three.js reads from it
  const state = { rotY: 0, rotX: 0, camZ: 5, emissive: 0 };

  ScrollTrigger.create({
    trigger: '.scene-section',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2,
    onUpdate(self) {
      const p = self.progress;         // 0 → 1 as user scrolls through section
      state.rotY   = p * Math.PI * 2;  // full spin on scroll
      state.rotX   = p * Math.PI * 0.5;
      state.camZ   = 5 - p * 2;        // camera dollies in
      state.emissive = p;              // material glows
    }
  });

  // 2. Read proxy in animate loop
  function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.y = state.rotY;
    mesh.rotation.x = state.rotX;
    camera.position.z = state.camZ;
    mesh.material.emissiveIntensity = state.emissive;
    renderer.render(scene, camera);
  }
  animate();
  \`\`\`

  ### Pattern B — GSAP ticker as render loop (cleanest integration)
  \`\`\`javascript
  // Replace requestAnimationFrame with GSAP ticker
  gsap.ticker.add(() => {
    controls?.update();
    renderer.render(scene, camera);
  });
  gsap.ticker.lagSmoothing(0); // prevents jump after tab blur

  // Now GSAP can tween Three.js object properties directly:
  gsap.to(mesh.rotation, {
    y: Math.PI * 2, x: Math.PI * 0.3,
    ease: 'none',
    scrollTrigger: {
      trigger: '.scene-section',
      start: 'top center',
      end: 'bottom center',
      scrub: 1.5,
    }
  });

  gsap.to(mesh.scale, {
    x: 1.8, y: 1.8, z: 1.8,
    ease: 'power2.inOut',
    scrollTrigger: {
      trigger: '.scene-section',
      start: 'top 80%',
      end: 'center center',
      scrub: 1,
    }
  });

  gsap.to(camera.position, {
    z: 2, y: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.scene-section', start: 'top top', end: 'bottom bottom', scrub: 1 }
  });
  \`\`\`

  ### Pattern C — Multi-section 3D story (object changes state each section)
  \`\`\`javascript
  // Section 1 → 2: rotate and change color
  gsap.timeline({
    scrollTrigger: { trigger: '#section-2', start: 'top 80%', end: 'top 20%', scrub: 1 }
  })
  .to(mesh.rotation, { y: Math.PI, ease: 'power2.inOut' }, 0)
  .to(mesh.material.color, { r: 0.2, g: 0.8, b: 1.0, ease: 'none' }, 0);

  // Section 2 → 3: explode scale then reassemble
  gsap.timeline({
    scrollTrigger: { trigger: '#section-3', start: 'top 80%', end: 'top 20%', scrub: 1 }
  })
  .to(mesh.scale, { x: 2, y: 2, z: 2 }, 0)
  .to(mesh.position, { y: 1 }, 0)
  .to(mesh.scale, { x: 1, y: 1, z: 1 }, 0.5)
  .to(mesh.position, { y: 0 }, 0.5);
  \`\`\`

  ### Section markup for scroll-driven 3D
  \`\`\`html
  <!-- Canvas is sticky; sections scroll past it -->
  <div class="scene-section" style="position:relative; height:300vh;">
    <canvas id="canvas3d" style="position:sticky; top:0; width:100%; height:100vh; display:block;"></canvas>
  </div>
  <!-- This approach keeps canvas fixed while scroll drives animation -->
  \`\`\`

  ---

  ## Mouse-Interactive 3D

  ### Raycasting — hover glow + cursor change
  \`\`\`javascript
  const raycaster = new THREE.Raycaster();
  const pointer   = new THREE.Vector2();
  const hoverables = [mesh]; // add all meshes you want interactive

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
    pointer.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
  });

  // In animate loop — run every frame:
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(hoverables, true);
  if (hits.length) {
    mesh.material.emissiveIntensity = 0.6;   // glow on hover
    canvas.style.cursor = 'pointer';
  } else {
    mesh.material.emissiveIntensity = 0;
    canvas.style.cursor = 'default';
  }
  \`\`\`

  ### Mouse drag to rotate object (no OrbitControls)
  \`\`\`javascript
  let isDragging = false, prevX = 0, prevY = 0;
  let velX = 0, velY = 0; // inertia

  canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
  window.addEventListener('mouseup',   () => { isDragging = false; });
  canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    velX = dy * 0.005;
    velY = dx * 0.005;
    mesh.rotation.x += velX;
    mesh.rotation.y += velY;
    prevX = e.clientX; prevY = e.clientY;
  });

  // In animate loop — apply inertia:
  if (!isDragging) {
    mesh.rotation.x += velX;
    mesh.rotation.y += velY;
    velX *= 0.92; // friction
    velY *= 0.92;
  }
  \`\`\`

  ### 3D object follows mouse cursor (world-space tracking)
  \`\`\`javascript
  // Unproject mouse into 3D world at Z=0 plane
  const mouse3D = new THREE.Vector3();
  const targetPos = new THREE.Vector3();

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse3D.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
      0.5
    );
    mouse3D.unproject(camera);
    mouse3D.sub(camera.position).normalize();
    const dist = -camera.position.z / mouse3D.z;
    targetPos.copy(camera.position).addScaledVector(mouse3D, dist);
  });

  // In animate loop — smooth lerp to cursor:
  mesh.position.lerp(targetPos, 0.08);
  \`\`\`

  ### Scroll + Mouse combined — hero showcase
  \`\`\`javascript
  // Scroll rotates Y; mouse offsets X/Z for parallax depth feel
  let scrollRot = 0, mxOff = 0, myOff = 0;

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top', end: 'bottom top', scrub: 1,
    onUpdate(self) { scrollRot = self.progress * Math.PI * 1.5; }
  });

  canvas.addEventListener('mousemove', (e) => {
    mxOff = (e.clientX / window.innerWidth  - 0.5) * 0.8;
    myOff = (e.clientY / window.innerHeight - 0.5) * 0.4;
  });

  // In animate loop:
  mesh.rotation.y  += (scrollRot + mxOff - mesh.rotation.y)  * 0.05;
  mesh.rotation.x  += (myOff            - mesh.rotation.x)  * 0.05;
  camera.position.x += (mxOff * 1.5 - camera.position.x) * 0.04;
  camera.lookAt(scene.position);
  \`\`\`

  ### Mouse interaction rules
  - Always read \`canvas.getBoundingClientRect()\` — never use raw \`clientX / innerWidth\` on canvases that aren't full-viewport
  - Raycasting runs every frame in the animate loop (cheap, <0.1ms for <50 objects)
  - Use \`lerp()\` / \`+= (target - current) * factor\` for smooth easing — never snap directly to mouse position
  - \`velX *= 0.92\` friction gives realistic inertia; 0.85 = snappy, 0.95 = floaty
  - Always remove event listeners on cleanup (React \`useEffect\` return)

  ---

  ## Common Patterns

  ### Floating Particles / Starfield
  \`\`\`javascript
  const count = 3000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 20;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x7c6ff7, size: 0.05 })));
  \`\`\`

  ### Rotating Product on Pedestal
  \`\`\`javascript
  // Product mesh (replace geometry with your shape)
  const product = new THREE.Mesh(new THREE.TorusKnotGeometry(0.8,0.25,128,32),
    new THREE.MeshStandardMaterial({ color: 0x7c6ff7, metalness: 0.9, roughness: 0.1 }));
  product.castShadow = true;
  scene.add(product);

  // Pedestal
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.8,1,0.15,32),
    new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.6 }));
  pedestal.position.y = -1.2;
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  // Reflective floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20,20),
    new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.1, metalness: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.28;
  floor.receiveShadow = true;
  scene.add(floor);
  \`\`\`

  ### Animated Text (no font files — use CSS 3D or canvas texture)
  \`\`\`javascript
  // Canvas texture for text
  const canvas2d = document.createElement('canvas');
  canvas2d.width = 512; canvas2d.height = 128;
  const ctx = canvas2d.getContext('2d');
  ctx.fillStyle = '#7c6ff7';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HELLO 3D', 256, 90);
  const tex = new THREE.CanvasTexture(canvas2d);
  const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  scene.add(textMesh);
  \`\`\`

  ### Interactive Morphing Shape (click to change)
  \`\`\`javascript
  const shapes = [
    new THREE.BoxGeometry(1.5,1.5,1.5),
    new THREE.SphereGeometry(1,64,64),
    new THREE.TorusKnotGeometry(0.8,0.25,128,32),
    new THREE.IcosahedronGeometry(1.2,2),
  ];
  let idx = 0;
  const mesh = new THREE.Mesh(shapes[0], new THREE.MeshStandardMaterial({ color: 0x7c6ff7, metalness:0.8, roughness:0.2 }));
  scene.add(mesh);
  canvas.addEventListener('click', () => {
    idx = (idx + 1) % shapes.length;
    mesh.geometry = shapes[idx];
  });
  \`\`\`

  ## React / Next.js Component
  \`\`\`tsx
  import { useEffect, useRef } from 'react';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  export function Scene3D({ className = '' }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      const canvas = canvasRef.current!;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
      camera.position.set(0, 2, 5);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(5,10,5); scene.add(light);

      const mesh = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.8, 0.25, 128, 32),
        new THREE.MeshStandardMaterial({ color: 0x7c6ff7, metalness: 0.8, roughness: 0.2 })
      );
      scene.add(mesh);

      const ro = new ResizeObserver(() => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
      });
      ro.observe(canvas);

      let rafId: number;
      const clock = new THREE.Clock();
      const animate = () => {
        rafId = requestAnimationFrame(animate);
        mesh.rotation.y = clock.getElapsedTime() * 0.5;
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
      return () => { cancelAnimationFrame(rafId); renderer.dispose(); ro.disconnect(); };
    }, []);
    return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: 500 }} />;
  }
  \`\`\`

  ## Section Design — 3D Hero / Showcase
  Always wrap the canvas in a dark gradient section with a heading and subtle glow:
  \`\`\`html
  <section style="padding:5rem 1rem; background:linear-gradient(135deg,#050510,#0f0c29,#1a0533); position:relative; overflow:hidden;">
    <div style="max-width:960px; margin:0 auto; text-align:center;">
      <h2 style="font-size:2.5rem; font-weight:800; color:#fff; margin-bottom:0.5rem;">Explore in 3D</h2>
      <p style="color:#9ca3af; margin-bottom:2rem;">Drag to rotate · Scroll to zoom</p>
      <div style="padding:2px; border-radius:20px; background:linear-gradient(135deg,rgba(124,111,247,0.6),rgba(34,211,238,0.4));">
        <canvas id="canvas3d" style="width:100%;height:500px;display:block;border-radius:18px;"></canvas>
      </div>
    </div>
  </section>
  \`\`\`

  ## When to Auto-Add 3D (without user asking)
  - Hero section on tech/creative/gaming/metaverse sites → floating abstract shape
  - Product showcase → rotating product shape on reflective pedestal
  - Portfolio header → morphing icosahedron or torus knot
  - SaaS landing page → animated floating geometric shapes
  - 3D printing / manufacturing → wireframe + solid mesh
  - Data / analytics → animated globe or bar chart in 3D
  NEVER add 3D to: blog posts, forms, admin panels, simple landing pages with text focus.
</threejs_interactive_3d>
`
};

const spline3dSkill = {
  name: "spline-3d",
  description: "Embed interactive Spline (spline.design) 3D scenes: hero scenes, 3D product viewers/configurators, mouse/scroll/click-reactive objects, runtime events & animations.",
  triggers: /\b(spline|splinecode|spline-viewer|spline\.design|interactive 3d scene|3d hero|3d model viewer|3d configurator|product viewer)\b/i,
  body: () => `
<spline_interactive_3d>
  Use Spline when the user wants a polished, pre-designed interactive 3D scene embedded in the page —
  hero backgrounds, 3D product viewers/configurators, mouse/scroll/click-reactive objects. Spline scenes
  are authored visually in spline.design and exported as a public \`.splinecode\` URL. You EMBED that URL
  and drive it via the runtime API — you do NOT model the geometry yourself.

  ## Spline vs Three.js — pick the right tool
  - **Spline (this skill)** → the user names/has a Spline scene URL, or wants a designer-made interactive
    scene with built-in animations/states and minimal code. Best for "drop in this 3D model", hero scenes,
    product configurators.
  - **Three.js (threejs-3d skill)** → procedural/generated geometry, particles, shaders, globes, data-viz,
    or there is NO external scene file. **Default to Three.js when the user has no Spline URL.**
  - A \`prod.spline.design/.../scene.splinecode\` or \`my.spline.design/...\` URL is the signal to use Spline.

  ## Placeholder scene URL
  When the user supplies no scene, embed Spline's public demo so the page renders, and leave a clear
  comment to swap in their own exported URL:
  \`https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode\`
  (Get a real URL from the Spline editor: Export → Code/Viewer → copy the \`.splinecode\` link. The scene
  must be PUBLISHED or it 404s.)

  ===========================================================================
  ## EMBEDDING — pick the option that matches the project
  ===========================================================================

  ### Option A — Web Component (plain HTML / vanilla JS) — SIMPLEST, no build
  \`\`\`html
  <script type="module" src="https://unpkg.com/@splinetool/viewer@1.9.48/build/spline-viewer.js"><\/script>

  <spline-viewer
    url="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
    style="width:100%;height:600px;display:block;border-radius:16px;"
    loading-anim-type="spinner-small-dark"
  ></spline-viewer>
  \`\`\`
  Fully interactive by default (orbit/click/hover states baked into the scene). Pin the version.

  ### Option B — React
  \`\`\`bash
  npm install @splinetool/react-spline @splinetool/runtime
  \`\`\`
  \`\`\`tsx
  import Spline from '@splinetool/react-spline';

  export default function Hero() {
    return (
      <div style={{ width: '100%', height: 600 }}>
        {/* Replace with your exported scene URL */}
        <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
      </div>
    );
  }
  \`\`\`

  ### Option C — Next.js (App Router) — MUST be a client component
  \`\`\`tsx
  'use client';
  import Spline from '@splinetool/react-spline/next'; // SSR placeholder + better LCP

  export default function Scene() {
    return <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />;
  }
  \`\`\`
  Alternatively \`const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })\`.
  NEVER import react-spline into a Server Component — it touches \`window\` and causes hydration errors.

  ### Option D — Vanilla runtime Application (HTML, full programmatic control)
  \`\`\`html
  <canvas id="canvas3d" style="width:100%;height:600px;display:block;"></canvas>
  <script type="module">
    import { Application } from 'https://unpkg.com/@splinetool/runtime@1.9.48/build/runtime.js';
    const app = new Application(document.getElementById('canvas3d'));
    await app.load('https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode');
    const obj = app.findObjectByName('Cube');
    app.addEventListener('mouseHover', (e) => console.log('hover', e.target.name));
  <\/script>
  \`\`\`

  ===========================================================================
  ## INTERACTIVITY — the runtime Application API (this is the core value)
  ===========================================================================
  Capture the \`Application\` instance in \`onLoad\`, store it in a ref, then call its methods.
  In React, store found objects in refs too (a re-render would otherwise lose them).

  \`\`\`tsx
  import { useRef, useState } from 'react';
  import Spline from '@splinetool/react-spline';
  import type { Application, SPEObject, SplineEvent } from '@splinetool/runtime';

  export default function ProductConfigurator() {
    const app = useRef<Application | null>(null);
    const product = useRef<SPEObject | null>(null);
    const [loaded, setLoaded] = useState(false);

    function onLoad(spline: Application) {
      app.current = spline;
      product.current = spline.findObjectByName('Product'); // names are CASE-SENSITIVE
      setLoaded(true);
    }

    // React to clicks on scene objects (note: onSpline* props, NOT onMouseDown)
    function onSplineMouseDown(e: SplineEvent) {
      if (e.target.name === 'Button') app.current?.emitEvent('mouseHover', 'Card');
    }

    function rotate()  { if (product.current) product.current.rotation.y += Math.PI / 4; } // +45°
    function recolor() { product.current?.material.color.set(0xff6b6b); }                  // .set(hex)!
    function hide()    { if (product.current) product.current.visible = false; }
    function zoomOut() { app.current?.setZoom(0.7); }

    return (
      <div style={{ position: 'relative' }}>
        <Spline
          scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
          onLoad={onLoad}
          onSplineMouseDown={onSplineMouseDown}
          style={{ width: '100%', height: 600 }}
        />
        {loaded && (
          <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
            <button onClick={rotate}>Rotate</button>
            <button onClick={recolor}>Color</button>
            <button onClick={zoomOut}>Zoom out</button>
          </div>
        )}
      </div>
    );
  }
  \`\`\`

  ### Application methods (the full set you need)
  | Method | Purpose |
  |---|---|
  | \`findObjectByName('Name')\` | First object with that editor name → returns SPEObject (or undefined) |
  | \`findObjectById('uuid')\` | Object by stable UUID (use when names change often) |
  | \`emitEvent('mouseDown', 'Name')\` | Trigger a scene event/animation programmatically (forward) |
  | \`emitEventReverse('mouseHover', 'Card')\` | Play that event's animation in REVERSE |
  | \`setZoom(1.5)\` | Camera zoom (1 = default, <1 out, >1 in) |
  | \`addEventListener('mouseDown', cb)\` | Vanilla-runtime listener; cb gets \`e.target\` |

  ### SPEObject (returned by find*) — mutable props
  | Prop | Type / note |
  |---|---|
  | \`position\` | \`{x,y,z}\` — Spline units (NOT pixels); mutate directly |
  | \`rotation\` | \`{x,y,z}\` in RADIANS (\`Math.PI/4\` = 45°, \`Math.PI\` = 180°) |
  | \`scale\` | \`{x,y,z}\` multiplier |
  | \`material.color\` | set with \`.set(0xRRGGBB)\` — e.g. \`0xff6b6b\`; never assign a string |
  | \`visible\` | boolean |
  | \`obj.emitEvent('mouseHover')\` | trigger an event on that specific object |

  ### Event names (emitEvent / emitEventReverse / addEventListener)
  \`mouseDown\` · \`mouseUp\` · \`mouseHover\` · \`keyDown\` · \`keyUp\` · \`start\` · \`lookAt\` · \`follow\`

  ### React event-handler props (camelCase \`onSpline*\` — distinct from runtime listeners)
  \`onLoad\` · \`onSplineMouseDown\` · \`onSplineMouseUp\` · \`onSplineMouseHover\` · \`onSplineKeyDown\`
  · \`onSplineKeyUp\` · \`onSplineStart\` · \`onSplineLookAt\` · \`onSplineFollow\` · \`onSplineScroll\`.
  Each callback receives \`e.target\` (the SPEObject: \`name\`, \`id\`, \`position\`, …).

  ===========================================================================
  ## MOTION RECIPES
  ===========================================================================

  ### Mouse-parallax tilt of the whole scene (wraps any embed option)
  \`\`\`javascript
  const wrap = document.querySelector('.spline-wrap');
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 8;   // degrees
    const y = (e.clientY / window.innerHeight - 0.5) * 8;
    wrap.style.transform = \`perspective(1000px) rotateY(\${x}deg) rotateX(\${-y}deg)\`;
  });
  \`\`\`

  ### Scroll-driven scene animation (GSAP ScrollTrigger → emitEvent)
  \`\`\`tsx
  import { useRef } from 'react';
  import Spline from '@splinetool/react-spline';
  import gsap from 'gsap';
  import ScrollTrigger from 'gsap/ScrollTrigger';
  gsap.registerPlugin(ScrollTrigger);

  export default function ScrollScene() {
    const app = useRef<any>(null);
    function onLoad(spline: any) {
      app.current = spline;
      ScrollTrigger.create({
        trigger: '.scene-container', start: 'top center',
        onEnter: () => spline.emitEvent('mouseHover', 'Product'),
        onLeaveBack: () => spline.emitEventReverse('mouseHover', 'Product'),
      });
    }
    return (
      <div className="scene-container" style={{ height: 600 }}>
        <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" onLoad={onLoad} />
      </div>
    );
  }
  \`\`\`

  ### Hero section layout
  \`\`\`html
  <section style="position:relative; min-height:100vh; background:linear-gradient(135deg,#050510,#0f0c29,#1a0533); overflow:hidden;">
    <div class="spline-wrap" style="position:absolute; inset:0;">
      <spline-viewer url="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" style="width:100%;height:100%;"></spline-viewer>
    </div>
    <div style="position:relative; z-index:2; padding:6rem 1rem; text-align:center; pointer-events:none;">
      <h1 style="font-size:3.5rem; font-weight:800; color:#fff;">Built in 3D</h1>
      <p style="color:#9ca3af;">Drag the scene · scroll to explore</p>
    </div>
  </section>
  \`\`\`
  Put overlay text in \`pointer-events:none\` so the scene stays draggable; set \`pointer-events:auto\`
  on actual buttons/links inside the overlay.

  ===========================================================================
  ## PERFORMANCE
  ===========================================================================
  - \`renderOnDemand\` (React prop, default \`true\`) renders only on change — keep it on for static heroes.
  - Lazy-load heavy/below-the-fold scenes: \`const Spline = React.lazy(() => import('@splinetool/react-spline'))\`
    inside \`<Suspense fallback={<div>Loading 3D…</div>}>\`. (Web component: add \`loading="lazy"\`.)
  - One heavy scene per page. Always give the canvas/viewer an explicit height (it collapses to 0 otherwise).
  - Mobile: serve a lighter scene (fewer polys, smaller textures, no shadows) or shrink height; optionally
    \`app.setZoom(0.7)\` on small screens.

  ===========================================================================
  ## COMMON PITFALLS (check these first when it "doesn't work")
  ===========================================================================
  - Scene blank → URL must be the full \`https://prod.spline.design/.../scene.splinecode\`, scene PUBLISHED,
    no CORS errors, \`@splinetool/runtime\` installed.
  - Events dead → use \`onSplineMouseDown\` (not \`onMouseDown\`); the object must have that event configured
    in the Spline editor; object name must match EXACTLY (case-sensitive).
  - \`emitEvent\` no-op → only call after \`onLoad\` fired; gate with an \`isLoaded\` flag.
  - Object \`undefined\` → name mismatch, or called before \`onLoad\`; use \`findObjectById\` for renamed objects.
  - Refs lost after re-render → store \`app\` and found objects in \`useRef\`, never plain module/local vars.
  - Next.js hydration error → \`'use client'\` + \`@splinetool/react-spline/next\`, or \`dynamic(..., { ssr:false })\`.
  - Color not changing → \`obj.material.color.set(0xff6b6b)\`, NOT \`obj.material.color = '#ff6b6b'\`.
  - Rotation looks wrong → values are RADIANS: \`deg * Math.PI / 180\`.

  ## Export-to-Three.js bridge
  If the user wants code-level control over a Spline-designed model, export it from Spline as GLB/GLTF and
  load it with Three.js \`GLTFLoader\` (see threejs-3d skill) — then add custom shaders/physics in code.

  ## Rules
  - Pin CDN versions (\`@1.9.48\`); "latest" can break between builds.
  - No Spline URL + "build me 3D" → use the threejs-3d skill instead, don't fake a scene.
  - Clean up GSAP/ScrollTrigger and window listeners in the \`useEffect\` return.
</spline_interactive_3d>
`
};

const internetAssetsSkill = {
  name: "internet-assets",
  description: "Real internet assets for websites: Unsplash images, icons, logos, fonts — never placeholder images. Use whenever building or extending pages that display images or media.",
  triggers: /\b(image|images|photo|photos|picture|pictures|unsplash|icon|icons|logo|logos|stock|assets?|avatar|illustration|background image|img)\b/,
  defaultOnFirstMessage: true,
  body: () => `
<internet_assets>
  When generating ANY website or landing page, use real internet images and interactive 3D models automatically — never use placeholder images or leave image slots empty.

  ## Real Images via Unsplash (No API Key Needed)

  Use Unsplash Source URLs directly as \`src\` attributes in \`<img>\` tags or CSS \`background-image\`. They return real high-quality photos matched to the keywords.

  URL format: \`https://source.unsplash.com/{WIDTH}x{HEIGHT}/?{keyword1},{keyword2}&sig={N}\`

  The \`&sig=N\` parameter (any integer) ensures different images for the same keyword set — increment it for each image to avoid duplicates.

  Size guide:
  - Hero banner / full-width: 1920x1080 or 1600x900
  - Section background: 1440x900
  - Card / thumbnail: 600x400 or 400x300
  - Profile / avatar: 200x200 (add \`face,portrait\` keywords)
  - Product image: 800x800 or 600x600
  - Blog post cover: 800x500

  Industry keyword guide — use keywords that match the website's topic:
  | Type | Good Keywords |
  |------|--------------|
  | Restaurant / Food | pizza,food,restaurant,cooking,chef,kitchen,dish |
  | Tech / SaaS | technology,computer,code,startup,office,desk,screen |
  | Fitness | gym,fitness,workout,sport,athlete,training,weights |
  | Real Estate | house,architecture,interior,modern,living,home,property |
  | Fashion | fashion,style,clothing,model,outfit,boutique,apparel |
  | Healthcare | medical,doctor,clinic,health,wellness,care |
  | Finance | finance,business,corporate,money,banking,investment |
  | Travel | travel,city,landscape,adventure,destination,tourism |
  | Education | education,student,campus,library,learning,classroom |
  | E-commerce | product,shopping,minimal,clean,packaging,retail |

  HTML usage (always add \`loading="lazy"\` and descriptive \`alt\` text):
  \`\`\`html
  <img src="https://source.unsplash.com/1920x1080/?pizza,restaurant,food" alt="Restaurant hero" loading="lazy" class="w-full h-full object-cover" />
  <img src="https://source.unsplash.com/600x400/?cooking,chef&sig=2" alt="Our kitchen" loading="lazy" />
  \`\`\`

  CSS background usage:
  \`\`\`css
  .hero { background-image: url('https://source.unsplash.com/1440x900/?restaurant,interior&sig=1'); background-size: cover; }
  \`\`\`

  React/JSX usage:
  \`\`\`tsx
  <img src="https://source.unsplash.com/800x600/?technology,office&sig=1" alt="Team at work" className="w-full h-full object-cover rounded-xl" loading="lazy" />
  \`\`\`

  ## 3D Models: Dynamic model-viewer with Sketchfab CC0 GLB

  IMPORTANT: Never use Sketchfab iframes — they are blocked in sandboxed environments and produce a blank viewer.
  Always use Google's \`<model-viewer>\` web component to display GLB files. When the user provides a GLB URL via
  the 3D model browser, use it directly. For auto-generated 3D sections, fetch a CC0 GLB from Sketchfab at runtime.

  Always add this to \`<head>\`:
  \`\`\`html
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"><\/script>
  \`\`\`

  ### HTML / Vanilla JS — fetch CC0 GLB at runtime and display with model-viewer:
  \`\`\`html
  <!-- Include model-viewer CDN in <head> -->
  <model-viewer
    id="mv-KEYWORD"
    alt="3D Model"
    auto-rotate
    camera-controls
    shadow-intensity="1.5"
    exposure="1.2"
    environment-image="neutral"
    style="width:100%;height:480px;border-radius:12px;background:#0f0c29;"
    loading="eager"
    reveal="auto"
  ></model-viewer>
  <script>
  (async () => {
    try {
      const res = await fetch('https://api.sketchfab.com/v3/models?q=KEYWORD&count=5&type=models&license=cc0');
      const data = await res.json();
      const model = data.results?.[0];
      if (!model) return;
      // Note: Sketchfab Download API requires API key for GLB URLs.
      // For auto-generated sites, show a placeholder with Sketchfab link.
      const viewer = document.getElementById('mv-KEYWORD');
      if (viewer) {
        viewer.setAttribute('alt', model.name || 'KEYWORD 3D model');
        // If you have a GLB URL (from Sitara 3D Model Browser), set it here:
        // viewer.setAttribute('src', 'YOUR_GLB_URL');
      }
    } catch(e) { console.warn('3D model info load failed', e); }
  })();
  <\/script>
  \`\`\`

  ### React / Next.js component (when GLB URL is provided by user):
  \`\`\`tsx
  import { useEffect } from 'react';

  // Declare model-viewer as a custom element
  declare global {
    namespace JSX {
      interface IntrinsicElements {
        'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
          src?: string; alt?: string; 'auto-rotate'?: boolean; 'camera-controls'?: boolean;
          'shadow-intensity'?: string; exposure?: string; 'environment-image'?: string;
          loading?: string; reveal?: string;
        }, HTMLElement>;
      }
    }
  }

  function ModelViewer3D({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
    useEffect(() => {
      // Load model-viewer CDN if not already loaded
      if (!customElements.get('model-viewer')) {
        const s = document.createElement('script');
        s.type = 'module';
        s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
        document.head.appendChild(s);
      }
    }, []);
    return (
      <model-viewer
        src={src}
        alt={alt}
        auto-rotate
        camera-controls
        shadow-intensity="1.5"
        exposure="1.2"
        environment-image="neutral"
        style={{ width: '100%', height: 480, borderRadius: 12, background: '#0f0c29' } as any}
        loading="eager"
        reveal="auto"
        className={className}
      />
    );
  }

  // Usage: <ModelViewer3D src="https://cdn-example.com/model.glb" alt="Product 3D View" />
  \`\`\`

  IMPORTANT for auto-generated websites: When a user has NOT provided a specific GLB URL via the
  3D model browser, add a visually polished placeholder section with a "Load 3D Model" link to
  Sketchfab instead of a broken iframe. Only use \`<model-viewer src="...">\` when you have an
  actual GLB URL to provide.

  ## When to Apply Automatically (No User Prompt Needed)

  ### Always use Unsplash images for:
  - Hero section (background or foreground photo)
  - About / team section (portraits with \`face,portrait,professional\` keywords)
  - Services / features section (illustrative photos per item, use \`&sig=N\` to vary)
  - Blog / news card thumbnails
  - Portfolio / project thumbnails
  - Testimonial author avatars

  ### Auto-add 3D model section when building these site types:
  - Product showcase (furniture, gadgets, footwear, jewelry, vehicles)
  - Architecture or real estate (buildings, interiors)
  - Creative agency or portfolio
  - Gaming, entertainment, or metaverse project
  - Engineering, science, or tech product
  - 3D printing or manufacturing

  ### Skip 3D for:
  - Blog, news, or text-heavy sites
  - Forms, sign-up, or contact pages
  - Admin dashboards or data tables
  - When the user explicitly says no 3D

  ## Combined Example — Product Card with Real Image + 3D View

  \`\`\`html
  <!-- Add in <head>: <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"><\/script> -->
  <div class="product-card rounded-2xl overflow-hidden bg-white shadow-xl">
    <!-- Real product photo from Unsplash -->
    <img src="https://source.unsplash.com/800x600/?modern,chair,furniture&sig=5"
         alt="Featured Chair" loading="lazy" class="w-full h-56 object-cover" />
    <div class="p-6">
      <h3 class="text-xl font-bold mb-2">The Aria Chair</h3>
      <p class="text-gray-500 mb-4">Explore every angle in 3D — drag to rotate, scroll to zoom.</p>
      <!-- model-viewer with GLB URL (provided by user via 3D Model Browser) -->
      <model-viewer
        src="GLB_URL_PROVIDED_BY_USER"
        alt="Modern Dining Chair 3D"
        auto-rotate
        camera-controls
        shadow-intensity="1"
        exposure="1.2"
        environment-image="neutral"
        style="width:100%;height:320px;border-radius:8px;background:#0f0c29;"
        loading="eager"
        reveal="auto"
      ></model-viewer>
    </div>
  </div>
  \`\`\`
</internet_assets>
`
};

const databaseSupabaseSkill = {
  name: "database-supabase",
  description: "Supabase database rules: migrations + immediate queries, RLS, auth, data-safety requirements.",
  triggers: /\b(database|db|supabase|sql|postgres|table|tables|schema|migration|crud|auth|login|log in|signup|sign up|signin|sign in|register|account|persist|storage)\b/,
  isNeeded: (ctx) => !!ctx.supabase?.isConnected,
  body: ({ supabase }) => `
<database_instructions>
  The following instructions guide how you should handle database operations in projects.

  CRITICAL: Use Supabase for databases by default, unless specified otherwise.

  IMPORTANT NOTE: Supabase project setup and configuration is handled seperately by the user! ${supabase ? !supabase.isConnected ? 'You are not connected to Supabase. Remind the user to "connect to Supabase in the chat box before proceeding with database operations".' : !supabase.hasSelectedProject ? 'Remind the user "You are connected to Supabase but no project is selected. Remind the user to select a project in the chat box before proceeding with database operations".' : "" : ""} 
    IMPORTANT: Create a .env file if it doesnt exist${supabase?.isConnected && supabase?.hasSelectedProject && supabase?.credentials?.supabaseUrl && supabase?.credentials?.anonKey ? ` and include the following variables:
    VITE_SUPABASE_URL=${supabase.credentials.supabaseUrl}
    VITE_SUPABASE_ANON_KEY=${supabase.credentials.anonKey}` : "."}
  NEVER modify any Supabase configuration or \`.env\` files apart from creating the \`.env\`.

  Do not try to generate types for supabase.

  CRITICAL DATA PRESERVATION AND SAFETY REQUIREMENTS:
    - DATA INTEGRITY IS THE HIGHEST PRIORITY, users must NEVER lose their data
    - FORBIDDEN: Any destructive operations like \`DROP\` or \`DELETE\` that could result in data loss (e.g., when dropping columns, changing column types, renaming tables, etc.)
    - FORBIDDEN: Any transaction control statements (e.g., explicit transaction management) such as:
      - \`BEGIN\`
      - \`COMMIT\`
      - \`ROLLBACK\`
      - \`END\`

      Note: This does NOT apply to \`DO $$ BEGIN ... END $$\` blocks, which are PL/pgSQL anonymous blocks!

      Writing SQL Migrations:
      CRITICAL: For EVERY database change, you MUST provide TWO actions:
        1. Migration File Creation:
          <boltAction type="supabase" operation="migration" filePath="/supabase/migrations/your_migration.sql">
            /* SQL migration content */
          </boltAction>

        2. Immediate Query Execution:
          <boltAction type="supabase" operation="query" projectId="\${projectId}">
            /* Same SQL content as migration */
          </boltAction>

        Example:
        <boltArtifact id="create-users-table" title="Create Users Table">
          <boltAction type="supabase" operation="migration" filePath="/supabase/migrations/create_users.sql">
            CREATE TABLE users (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              email text UNIQUE NOT NULL
            );
          </boltAction>

          <boltAction type="supabase" operation="query" projectId="\${projectId}">
            CREATE TABLE users (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              email text UNIQUE NOT NULL
            );
          </boltAction>
        </boltArtifact>

    - IMPORTANT: The SQL content must be identical in both actions to ensure consistency between the migration file and the executed query.
    - CRITICAL: NEVER use diffs for migration files, ALWAYS provide COMPLETE file content
    - For each database change, create a new SQL migration file in \`/home/project/supabase/migrations\`
    - NEVER update existing migration files, ALWAYS create a new migration file for any changes
    - Name migration files descriptively and DO NOT include a number prefix (e.g., \`create_users.sql\`, \`add_posts_table.sql\`).

    - DO NOT worry about ordering as the files will be renamed correctly!

    - ALWAYS enable row level security (RLS) for new tables:

      <example>
        alter table users enable row level security;
      </example>

    - Add appropriate RLS policies for CRUD operations for each table

    - Use default values for columns:
      - Set default values for columns where appropriate to ensure data consistency and reduce null handling
      - Common default values include:
        - Booleans: \`DEFAULT false\` or \`DEFAULT true\`
        - Numbers: \`DEFAULT 0\`
        - Strings: \`DEFAULT ''\` or meaningful defaults like \`'user'\`
        - Dates/Timestamps: \`DEFAULT now()\` or \`DEFAULT CURRENT_TIMESTAMP\`
      - Be cautious not to set default values that might mask problems; sometimes it's better to allow an error than to proceed with incorrect data

    - CRITICAL: Each migration file MUST follow these rules:
      - ALWAYS Start with a markdown summary block (in a multi-line comment) that:
        - Include a short, descriptive title (using a headline) that summarizes the changes (e.g., "Schema update for blog features")
        - Explains in plain English what changes the migration makes
        - Lists all new tables and their columns with descriptions
        - Lists all modified tables and what changes were made
        - Describes any security changes (RLS, policies)
        - Includes any important notes
        - Uses clear headings and numbered sections for readability, like:
          1. New Tables
          2. Security
          3. Changes

        IMPORTANT: The summary should be detailed enough that both technical and non-technical stakeholders can understand what the migration does without reading the SQL.

      - Include all necessary operations (e.g., table creation and updates, RLS, policies)

      Here is an example of a migration file:

      <example>
        /*
          # Create users table

          1. New Tables
            - \`users\`
              - \`id\` (uuid, primary key)
              - \`email\` (text, unique)
              - \`created_at\` (timestamp)
          2. Security
            - Enable RLS on \`users\` table
            - Add policy for authenticated users to read their own data
        */

        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          created_at timestamptz DEFAULT now()
        );

        ALTER TABLE users ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can read own data"
          ON users
          FOR SELECT
          TO authenticated
          USING (auth.uid() = id);
      </example>

    - Ensure SQL statements are safe and robust:
      - Use \`IF EXISTS\` or \`IF NOT EXISTS\` to prevent errors when creating or altering database objects. Here are examples:

      <example>
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          created_at timestamptz DEFAULT now()
        );
      </example>

      <example>
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'last_login'
          ) THEN
            ALTER TABLE users ADD COLUMN last_login timestamptz;
          END IF;
        END $$;
      </example>

  Client Setup:
    - Use \`@supabase/supabase-js\`
    - Create a singleton client instance
    - Use the environment variables from the project's \`.env\` file
    - Use TypeScript generated types from the schema

  Authentication:
    - ALWAYS use email and password sign up
    - FORBIDDEN: NEVER use magic links, social providers, or SSO for authentication unless explicitly stated!
    - FORBIDDEN: NEVER create your own authentication system or authentication table, ALWAYS use Supabase's built-in authentication!
    - Email confirmation is ALWAYS disabled unless explicitly stated!

  Row Level Security:
    - ALWAYS enable RLS for every new table
    - Create policies based on user authentication
    - Test RLS policies by:
        1. Verifying authenticated users can only access their allowed data
        2. Confirming unauthenticated users cannot access protected data
        3. Testing edge cases in policy conditions

  Best Practices:
    - One migration per logical change
    - Use descriptive policy names
    - Add indexes for frequently queried columns
    - Keep RLS policies simple and focused
    - Use foreign key constraints

  TypeScript Integration:
    - Generate types from database schema
    - Use strong typing for all database operations
    - Maintain type safety throughout the application

  IMPORTANT: NEVER skip RLS setup for any table. Security is non-negotiable!
</database_instructions>
`
};

const fullstackSkill = {
  name: "fullstack",
  description: "Full-stack app patterns: backend APIs, auth flows, payments, server architecture, data modeling.",
  triggers: /\b(backend|back-end|fullstack|full-stack|full stack|server|api|apis|endpoint|express|fastify|auth|login|log in|signup|sign up|jwt|session|stripe|payment|checkout|webhook|websocket|database|prisma|orm|rest|graphql)\b/,
  body: () => `
<fullstack_skill>
  When the user asks for a full-stack website, API, dashboard, SaaS, or any project that needs
  a backend, database, or auth — follow this protocol BEFORE writing any code.

  ═══════════════════════════════════════════════════════
  ## STEP 1 — ALWAYS ask for required variables first
  ═══════════════════════════════════════════════════════

  Before generating any code, output a single message that:
  1. States the stack you will build (Next.js App Router / FastAPI)
  2. Lists every environment variable the project needs with a short description
  3. Offers a **Demo Mode** fallback for the database if the user doesn't have credentials

  Template message to send:

  > **Before I build, I need a few details:**
  >
  > **Stack:** Next.js 14 App Router + PostgreSQL  (or FastAPI + MongoDB, etc.)
  >
  > **Required variables — please provide values, or type "demo" for any you don't have yet:**
  >
  > | Variable | Purpose | Example |
  > |---|---|---|
  > | \`DATABASE_URL\` | Postgres connection | \`postgresql://user:pass@host/db\` |
  > | \`NEXTAUTH_SECRET\` | Session encryption (32-char random string) | run: \`openssl rand -base64 32\` |
  > | \`NEXTAUTH_URL\` | App URL | \`http://localhost:3000\` |
  > | \`RESEND_API_KEY\` | Email sending | \`re_xxxx\` |
  >
  > Type **"demo"** for any variable you don't have — I'll substitute a working local alternative.

  NEVER skip this step. NEVER assume env var values. NEVER hardcode credentials.

  ═══════════════════════════════════════════════════════
  ## STEP 2 — Required variables by stack & service
  ═══════════════════════════════════════════════════════

  Ask ONLY for variables that the project actually uses. Use this table:

  | Service | Variables to ask for |
  |---|---|
  | **Supabase** | \`NEXT_PUBLIC_SUPABASE_URL\`, \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`, \`SUPABASE_SERVICE_ROLE_KEY\` |
  | **MongoDB Atlas** | \`MONGODB_URI\` (format: \`mongodb+srv://user:pass@cluster.mongodb.net/dbname\`) |
  | **PostgreSQL** | \`DATABASE_URL\` (format: \`postgresql://user:pass@host:5432/dbname\`) |
  | **MySQL** | \`DATABASE_URL\` (format: \`mysql://user:pass@host:3306/dbname\`) |
  | **Redis** | \`REDIS_URL\` (format: \`redis://default:pass@host:6379\`) |
  | **NextAuth.js** | \`NEXTAUTH_SECRET\` (random 32-char string), \`NEXTAUTH_URL\` |
  | **Clerk auth** | \`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\`, \`CLERK_SECRET_KEY\` |
  | **Stripe** | \`STRIPE_SECRET_KEY\`, \`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\`, \`STRIPE_WEBHOOK_SECRET\` |
  | **Resend email** | \`RESEND_API_KEY\` |
  | **SendGrid** | \`SENDGRID_API_KEY\` |
  | **Cloudinary** | \`CLOUDINARY_CLOUD_NAME\`, \`CLOUDINARY_API_KEY\`, \`CLOUDINARY_API_SECRET\` |
  | **AWS S3** | \`AWS_ACCESS_KEY_ID\`, \`AWS_SECRET_ACCESS_KEY\`, \`AWS_REGION\`, \`AWS_BUCKET_NAME\` |
  | **Pusher** | \`PUSHER_APP_ID\`, \`PUSHER_KEY\`, \`PUSHER_SECRET\`, \`PUSHER_CLUSTER\` |
  | **OpenAI** | \`OPENAI_API_KEY\` |
  | **FastAPI JWT** | \`SECRET_KEY\` (random 32-char), \`ALGORITHM\` (default: \`HS256\`), \`ACCESS_TOKEN_EXPIRE_MINUTES\` |

  ═══════════════════════════════════════════════════════
  ## STEP 3 — Demo Mode (user types "demo" for a variable)
  ═══════════════════════════════════════════════════════

  If the user cannot provide a database credential, substitute a **fully working local alternative**
  that requires zero external accounts. The app must still work — no broken pages.

  | Real service | Demo substitute | How |
  |---|---|---|
  | PostgreSQL / MySQL | **SQLite** via Prisma | \`datasource db { provider = "sqlite" url = "file:./dev.db" }\` |
  | MongoDB | **lowdb** (JSON file DB) | \`npm install lowdb@3\` — stores data in \`db.json\` |
  | Redis | **In-memory Map** | Simple JS \`Map\` as a module-level singleton |
  | Auth / sessions | **iron-session** with cookie | No external service needed |
  | Email | **Console log** stub | Log the email content to stdout, show it on screen |
  | File storage | **Local \`/public/uploads\`** | Save files to disk in the WebContainer |

  When using demo mode:
  - Add a visible yellow banner: \`⚠️ Running in Demo Mode — data resets on restart\`
  - Set \`DATABASE_URL="file:./dev.db"\` in \`.env.local\` automatically
  - Comment every demo substitution with \`// DEMO MODE — replace with real value in production\`
  - Structure the code so swapping to production only requires updating \`.env\` — no code changes

  ═══════════════════════════════════════════════════════
  ## Next.js 14 App Router — Full-Stack Scaffold
  ═══════════════════════════════════════════════════════

  ### Folder structure
  \`\`\`
  app/
    (auth)/
      login/page.tsx
      register/page.tsx
    (dashboard)/
      layout.tsx          ← protected layout (redirects if not authed)
      page.tsx
    api/
      auth/[...nextauth]/route.ts
      [resource]/
        route.ts          ← GET list, POST create
        [id]/route.ts     ← GET one, PUT update, DELETE
    layout.tsx            ← root layout with providers
    page.tsx              ← public landing page
  components/
    ui/                   ← shadcn/ui or custom primitives
    forms/
    layout/
  lib/
    db.ts                 ← database client singleton
    auth.ts               ← auth options / session helpers
    validations.ts        ← zod schemas
  middleware.ts           ← route protection
  .env.local              ← all secrets (gitignored)
  \`\`\`

  ### Database client singleton (Prisma example)
  \`\`\`typescript
  // lib/db.ts
  import { PrismaClient } from '@prisma/client';
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
  export const db = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
  \`\`\`

  ### Database client singleton (MongoDB + Mongoose example)
  \`\`\`typescript
  // lib/db.ts
  import mongoose from 'mongoose';
  const MONGODB_URI = process.env.MONGODB_URI!;
  let cached = (global as any).mongoose ?? { conn: null, promise: null };
  export async function connectDB() {
    if (cached.conn) return cached.conn;
    cached.promise ??= mongoose.connect(MONGODB_URI, { bufferCommands: false });
    cached.conn = await cached.promise;
    return cached.conn;
  }
  \`\`\`

  ### API route pattern (App Router)
  \`\`\`typescript
  // app/api/posts/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { getServerSession } from 'next-auth';
  import { authOptions } from '@/lib/auth';
  import { db } from '@/lib/db';
  import { z } from 'zod';

  const createSchema = z.object({ title: z.string().min(1), content: z.string() });

  export async function GET() {
    const posts = await db.post.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(posts);
  }

  export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = createSchema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
    const post = await db.post.create({ data: { ...body.data, authorId: session.user.id } });
    return NextResponse.json(post, { status: 201 });
  }
  \`\`\`

  ### Middleware (route protection)
  \`\`\`typescript
  // middleware.ts
  import { withAuth } from 'next-auth/middleware';
  export default withAuth({ pages: { signIn: '/login' } });
  export const config = { matcher: ['/dashboard/:path*', '/api/protected/:path*'] };
  \`\`\`

  ### NextAuth setup
  \`\`\`typescript
  // lib/auth.ts
  import type { NextAuthOptions } from 'next-auth';
  import CredentialsProvider from 'next-auth/providers/credentials';
  import bcrypt from 'bcryptjs';
  import { db } from './db';

  export const authOptions: NextAuthOptions = {
    providers: [
      CredentialsProvider({
        name: 'credentials',
        credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
        async authorize(creds) {
          if (!creds?.email || !creds.password) return null;
          const user = await db.user.findUnique({ where: { email: creds.email } });
          if (!user || !(await bcrypt.compare(creds.password, user.password))) return null;
          return { id: user.id, email: user.email, name: user.name };
        }
      })
    ],
    session: { strategy: 'jwt' },
    callbacks: {
      jwt: async ({ token, user }) => { if (user) token.id = user.id; return token; },
      session: async ({ session, token }) => { if (token) session.user.id = token.id as string; return session; },
    },
    pages: { signIn: '/login' },
    secret: process.env.NEXTAUTH_SECRET,
  };
  \`\`\`

  ### .env.local template (always generate this file)
  \`\`\`bash
  # Database
  DATABASE_URL="file:./dev.db"          # Demo: SQLite. Production: replace with real URL

  # Auth
  NEXTAUTH_URL="http://localhost:3000"
  NEXTAUTH_SECRET=""                    # Generate: openssl rand -base64 32

  # Add other keys here as needed
  \`\`\`

  ═══════════════════════════════════════════════════════
  ## FastAPI — Full-Stack Scaffold
  ═══════════════════════════════════════════════════════

  ### Folder structure
  \`\`\`
  app/
    main.py               ← FastAPI app, CORS, router includes
    config.py             ← pydantic-settings BaseSettings (reads .env)
    database.py           ← SQLAlchemy engine + session factory
    models/               ← SQLAlchemy ORM models
      user.py
      post.py
    schemas/              ← Pydantic request/response schemas
      user.py
      post.py
    routers/              ← APIRouter per resource
      auth.py
      users.py
      posts.py
    dependencies.py       ← get_db, get_current_user
    utils/
      security.py         ← password hashing, JWT
  .env                    ← secrets (gitignored)
  requirements.txt
  \`\`\`

  ### config.py — reads ALL env vars via pydantic-settings
  \`\`\`python
  from pydantic_settings import BaseSettings

  class Settings(BaseSettings):
      DATABASE_URL: str = "sqlite+aiosqlite:///./demo.db"  # demo fallback
      SECRET_KEY: str = "change-me-in-production"
      ALGORITHM: str = "HS256"
      ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
      CORS_ORIGINS: list[str] = ["http://localhost:3000"]

      class Config:
          env_file = ".env"

  settings = Settings()
  \`\`\`

  ### database.py — async SQLAlchemy (works with SQLite demo + PostgreSQL production)
  \`\`\`python
  from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
  from sqlalchemy.orm import DeclarativeBase
  from app.config import settings

  engine = create_async_engine(settings.DATABASE_URL, echo=False)
  AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

  class Base(DeclarativeBase):
      pass

  async def get_db() -> AsyncSession:
      async with AsyncSessionLocal() as session:
          yield session
  \`\`\`

  ### main.py
  \`\`\`python
  from fastapi import FastAPI
  from fastapi.middleware.cors import CORSMiddleware
  from app.config import settings
  from app.database import engine, Base
  from app.routers import auth, users, posts

  app = FastAPI(title="API", version="1.0.0")

  app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS,
      allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

  @app.on_event("startup")
  async def startup():
      async with engine.begin() as conn:
          await conn.run_sync(Base.metadata.create_all)  # auto-creates tables on start

  app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
  app.include_router(users.router, prefix="/api/users", tags=["users"])
  app.include_router(posts.router, prefix="/api/posts", tags=["posts"])
  \`\`\`

  ### Auth router (JWT)
  \`\`\`python
  from fastapi import APIRouter, Depends, HTTPException, status
  from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
  from sqlalchemy.ext.asyncio import AsyncSession
  from jose import JWTError, jwt
  from passlib.context import CryptContext
  from datetime import datetime, timedelta
  from app.config import settings
  from app.database import get_db

  router = APIRouter()
  pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
  oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

  def create_access_token(data: dict):
      expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
      return jwt.encode({**data, "exp": expire}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

  async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
      try:
          payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
          user_id: str = payload.get("sub")
          if user_id is None: raise HTTPException(status_code=401, detail="Invalid token")
      except JWTError:
          raise HTTPException(status_code=401, detail="Invalid token")
      # fetch user from db here
      return user_id

  @router.post("/token")
  async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
      # verify user against db
      token = create_access_token({"sub": "user_id_here"})
      return {"access_token": token, "token_type": "bearer"}
  \`\`\`

  ### requirements.txt (always generate this)
  \`\`\`
  fastapi>=0.111.0
  uvicorn[standard]>=0.29.0
  pydantic-settings>=2.2.0
  sqlalchemy[asyncio]>=2.0.0
  aiosqlite>=0.20.0          # demo SQLite driver — no credentials needed
  asyncpg>=0.29.0            # production PostgreSQL driver
  motor>=3.4.0               # MongoDB async driver (if MongoDB chosen)
  python-jose[cryptography]>=3.3.0
  passlib[bcrypt]>=1.7.4
  python-multipart>=0.0.9
  \`\`\`

  ### .env template (always generate this)
  \`\`\`bash
  # Database — demo uses SQLite (no credentials needed)
  DATABASE_URL=sqlite+aiosqlite:///./demo.db
  # Production PostgreSQL example:
  # DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
  # Production MongoDB example:
  # MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

  # Auth
  SECRET_KEY=change-me-generate-with-openssl-rand-base64-32
  ALGORITHM=HS256
  ACCESS_TOKEN_EXPIRE_MINUTES=30
  \`\`\`

  ═══════════════════════════════════════════════════════
  ## Critical Rules
  ═══════════════════════════════════════════════════════

  1. **Always ask for variables BEFORE building** — one upfront message, never mid-build
  2. **Never hardcode secrets** — every credential goes in \`.env\` / \`.env.local\`
  3. **Always generate the \`.env\` file** with placeholder comments so user knows what to fill
  4. **Always generate \`.gitignore\`** that includes \`.env\`, \`.env.local\`, \`*.db\`, \`__pycache__\`
  5. **Demo mode = SQLite** — zero config, works in WebContainer, swap to production by editing \`.env\` only
  6. **Database connections are singletons** — never open a new connection per request
  7. **Always add Zod (Next.js) or Pydantic (FastAPI) validation** on every API input
  8. **Always protect routes** — middleware.ts (Next.js) or Depends(get_current_user) (FastAPI)
  9. **CORS** — always configure for FastAPI; Next.js handles it via same-origin API routes
  10. **Passwords** — always hash with bcrypt, never store plain text
</fullstack_skill>
`
};

const mobileAppSkill = {
  name: "mobile-app",
  description: "Mobile app development with Expo / React Native: project setup, navigation, native UI patterns.",
  triggers: /\b(mobile|react native|expo|ios|android|app store|play store|native app)\b/,
  body: () => `
<mobile_app_instructions>
  The following instructions provide guidance on mobile app development, It is ABSOLUTELY CRITICAL you follow these guidelines.

  Think HOLISTICALLY and COMPREHENSIVELY BEFORE creating an artifact. This means:

    - Consider the contents of ALL files in the project
    - Review ALL existing files, previous file changes, and user modifications
    - Analyze the entire project context and dependencies
    - Anticipate potential impacts on other parts of the system

    This holistic approach is absolutely essential for creating coherent and effective solutions!

  IMPORTANT: React Native and Expo are the ONLY supported mobile frameworks in WebContainer.

  GENERAL GUIDELINES:

  1. Always use Expo (managed workflow) as the starting point for React Native projects
     - Use \`npx create-expo-app my-app\` to create a new project
     - When asked about templates, choose blank TypeScript

  2. File Structure:
     - Organize files by feature or route, not by type
     - Keep component files focused on a single responsibility
     - Use proper TypeScript typing throughout the project

  3. For navigation, use React Navigation:
     - Install with \`npm install @react-navigation/native\`
     - Install required dependencies: \`npm install @react-navigation/bottom-tabs @react-navigation/native-stack @react-navigation/drawer\`
     - Install required Expo modules: \`npx expo install react-native-screens react-native-safe-area-context\`

  4. For styling:
     - Use React Native's built-in styling

  5. For state management:
     - Use React's built-in useState and useContext for simple state
     - For complex state, prefer lightweight solutions like Zustand or Jotai

  6. For data fetching:
     - Use React Query (TanStack Query) or SWR
     - For GraphQL, use Apollo Client or urql

  7. Always provde feature/content rich screens:
      - Always include a index.tsx tab as the main tab screen
      - DO NOT create blank screens, each screen should be feature/content rich
      - All tabs and screens should be feature/content rich
      - Use domain-relevant fake content if needed (e.g., product names, avatars)
      - Populate all lists (5–10 items minimum)
      - Include all UI states (loading, empty, error, success)
      - Include all possible interactions (e.g., buttons, links, etc.)
      - Include all possible navigation states (e.g., back, forward, etc.)

  8. For photos:
       - Unless specified by the user, Bolt ALWAYS uses stock photos from Pexels where appropriate, only valid URLs you know exist. Bolt NEVER downloads the images and only links to them in image tags.

  EXPO CONFIGURATION:

  1. Define app configuration in app.json:
     - Set appropriate name, slug, and version
     - Configure icons and splash screens
     - Set orientation preferences
     - Define any required permissions

  2. For plugins and additional native capabilities:
     - Use Expo's config plugins system
     - Install required packages with \`npx expo install\`

  3. For accessing device features:
     - Use Expo modules (e.g., \`expo-camera\`, \`expo-location\`)
     - Install with \`npx expo install\` not npm/yarn

  UI COMPONENTS:

  1. Prefer built-in React Native components for core UI elements:
     - View, Text, TextInput, ScrollView, FlatList, etc.
     - Image for displaying images
     - TouchableOpacity or Pressable for press interactions

  2. For advanced components, use libraries compatible with Expo:
     - React Native Paper
     - Native Base
     - React Native Elements

  3. Icons:
     - Use \`lucide-react-native\` for various icon sets

  PERFORMANCE CONSIDERATIONS:

  1. Use memo and useCallback for expensive components/functions
  2. Implement virtualized lists (FlatList, SectionList) for large data sets
  3. Use appropriate image sizes and formats
  4. Implement proper list item key patterns
  5. Minimize JS thread blocking operations

  ACCESSIBILITY:

  1. Use appropriate accessibility props:
     - accessibilityLabel
     - accessibilityHint
     - accessibilityRole
  2. Ensure touch targets are at least 44×44 points
  3. Test with screen readers (VoiceOver on iOS, TalkBack on Android)
  4. Support Dark Mode with appropriate color schemes
  5. Implement reduced motion alternatives for animations

  DESIGN PATTERNS:

  1. Follow platform-specific design guidelines:
     - iOS: Human Interface Guidelines
     - Android: Material Design

  2. Component structure:
     - Create reusable components
     - Implement proper prop validation with TypeScript
     - Use React Native's built-in Platform API for platform-specific code

  3. For form handling:
     - Use Formik or React Hook Form
     - Implement proper validation (Yup, Zod)

  4. Design inspiration:
     - Visually stunning, content-rich, professional-grade UIs
     - Inspired by Apple-level design polish
     - Every screen must feel “alive” with real-world UX patterns
     

  EXAMPLE STRUCTURE:

  \`\`\`
  app/                        # App screens
  ├── (tabs)/
  │    ├── index.tsx          # Root tab IMPORTANT
  │    └── _layout.tsx        # Root tab layout
  ├── _layout.tsx             # Root layout
  ├── assets/                 # Static assets
  ├── components/             # Shared components
  ├── hooks/  
      └── useFrameworkReady.ts
  ├── constants/              # App constants
  ├── app.json                # Expo config
  ├── expo-env.d.ts           # Expo environment types
  ├── tsconfig.json           # TypeScript config
  └── package.json            # Package dependencies
  \`\`\`

  TROUBLESHOOTING:

  1. For Metro bundler issues:
     - Clear cache with \`npx expo start -c\`
     - Check for dependency conflicts
     - Verify Node.js version compatibility

  2. For TypeScript errors:
     - Ensure proper typing
     - Update tsconfig.json as needed
     - Use type assertions sparingly

  3. For native module issues:
     - Verify Expo compatibility
     - Use Expo's prebuild feature for custom native code
     - Consider upgrading to Expo's dev client for testing
</mobile_app_instructions>
`
};

const cavemanSkill = {
  name: "caveman",
  description: "Ultra-compressed communication mode: terse, token-efficient responses with full technical accuracy. Use when the user asks for brevity or token savings.",
  triggers: /\b(caveman|brief|terse|concise|short answer|less tokens|token|verbose)\b/,
  alwaysLoad: true,
  body: () => `<caveman_skill>
  Respond terse like smart caveman. All technical substance stay. Only fluff die.

  ## Persistence

  ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift. Still active if unsure. Off only: "stop caveman" / "normal mode".

  Default: **lite**. Switch: user say "caveman lite|full|ultra".

  ## Rules

  Drop: filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Short synonyms (big not extensive, fix not "implement a solution for"). Technical terms exact. Code blocks unchanged. Errors quoted exact.

  Pattern: [thing] [action] [reason]. [next step].

  Not: "Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by..."
  Yes: "Bug in auth middleware. Token expiry check use \`<\` not \`<=\`. Fix:"

  ## Intensity

  | Level | What change |
  |-------|------------|
  | **lite** | No filler/hedging. Keep articles + full sentences. Professional but tight |
  | **full** | Drop articles, fragments OK, short synonyms. Classic caveman |
  | **ultra** | Abbreviate prose words (DB/auth/config/req/res/fn/impl), strip conjunctions, arrows for causality (X → Y), one word when one word enough. Code symbols, function names, API names, error strings: never abbreviate |

  Example — "Why React component re-render?"
  - lite: "Your component re-renders because you create a new object reference each render. Wrap it in \`useMemo\`."
  - full: "New object ref each render. Inline object prop = new ref = re-render. Wrap in \`useMemo\`."
  - ultra: "Inline obj prop → new ref → re-render. \`useMemo\`."

  ## Auto-Clarity

  Drop caveman when:
  - Security warnings
  - Irreversible action confirmations
  - Multi-step sequences where fragment order or omitted conjunctions risk misread
  - Compression itself creates technical ambiguity
  - User asks to clarify or repeats question

  Resume caveman after clear part done.

  ## Boundaries (CRITICAL for this builder)

  - NEVER compress anything inside <boltArtifact> / <boltAction> tags: file contents, code, and shell commands must be complete and exact.
  - Compression applies ONLY to conversational prose around artifacts.
  - "stop caveman" or "normal mode": revert. Level persist until changed or session end.
</caveman_skill>`
};

const promptSkills = [
  uiUxDesignSkill,
  threejs3dSkill,
  spline3dSkill,
  internetAssetsSkill,
  databaseSupabaseSkill,
  fullstackSkill,
  mobileAppSkill,
  cavemanSkill
];
function selectSkills(userMessages, ctx, customSkills = [], llmSelected, disabledSkills = []) {
  const allSkills = [...promptSkills, ...customSkills].filter((skill) => !disabledSkills.includes(skill.name));
  if (!userMessages || userMessages.length === 0) {
    return allSkills;
  }
  if (llmSelected) {
    return allSkills.filter((skill) => skill.alwaysLoad || llmSelected.includes(skill.name));
  }
  const isFirstMessage = userMessages.length <= 2;
  const recentText = userMessages.slice(-3).join("\n").toLowerCase();
  return allSkills.filter(
    (skill) => skill.alwaysLoad || skill.isNeeded?.(ctx) || isFirstMessage && skill.defaultOnFirstMessage || skill.triggers.test(recentText)
  );
}
function skillsCatalog(active, customSkills = [], disabledSkills = []) {
  return [...promptSkills, ...customSkills].filter((skill) => !disabledSkills.includes(skill.name)).map((skill) => `  - ${skill.name}${active.includes(skill) ? " (loaded below)" : ""}: ${skill.description}`).join("\n");
}

const getSystemPrompt = (cwd = WORK_DIR, supabase, userMessages, customSkills = [], llmSelectedSkills, disabledSkills = []) => {
  const ctx = { cwd, supabase };
  const activeSkills = selectSkills(userMessages, ctx, customSkills, llmSelectedSkills, disabledSkills);
  const skillSections = activeSkills.map((skill) => skill.body(ctx)).join("\n\n");
  return `
You are Sitara, an expert AI assistant and exceptional senior software developer with vast knowledge across multiple programming languages, frameworks, and best practices.

<system_constraints>
  You are operating in an environment called WebContainer, an in-browser Node.js runtime that emulates a Linux system to some degree. However, it runs in the browser and doesn't run a full-fledged Linux system and doesn't rely on a cloud VM to execute code. All code is executed in the browser. It does come with a shell that emulates zsh. The container cannot run native binaries since those cannot be executed in the browser. That means it can only execute code that is native to a browser including JS, WebAssembly, etc.

  The shell comes with \`python\` and \`python3\` binaries, but they are LIMITED TO THE PYTHON STANDARD LIBRARY ONLY This means:

    - There is NO \`pip\` support! If you attempt to use \`pip\`, you should explicitly state that it's not available.
    - CRITICAL: Third-party libraries cannot be installed or imported.
    - Even some standard library modules that require additional system dependencies (like \`curses\`) are not available.
    - Only modules from the core Python standard library can be used.

  Additionally, there is no \`g++\` or any C/C++ compiler available. WebContainer CANNOT run native binaries or compile C/C++ code!

  Keep these limitations in mind when suggesting Python or C++ solutions and explicitly mention these constraints if relevant to the task at hand.

  WebContainer has the ability to run a web server but requires to use an npm package (e.g., Vite, servor, serve, http-server) or use the Node.js APIs to implement a web server.

  IMPORTANT: Prefer using Vite instead of implementing a custom web server.

  IMPORTANT: Git is NOT available.

  IMPORTANT: WebContainer CANNOT execute diff or patch editing so always write your code in full no partial/diff update

  IMPORTANT: Prefer writing Node.js scripts instead of shell scripts. The environment doesn't fully support shell scripts, so use Node.js for scripting tasks whenever possible!

  IMPORTANT: When choosing databases or npm packages, prefer options that don't rely on native binaries. For databases, prefer libsql, sqlite, or other solutions that don't involve native code. WebContainer CANNOT execute arbitrary native binaries.

  CRITICAL: You must never use the "bundled" type when creating artifacts, This is non-negotiable and used internally only.

  CRITICAL: You MUST always follow the <boltArtifact> format.

  Available shell commands:
    File Operations:
      - cat: Display file contents
      - cp: Copy files/directories
      - ls: List directory contents
      - mkdir: Create directory
      - mv: Move/rename files
      - rm: Remove files
      - rmdir: Remove empty directories
      - touch: Create empty file/update timestamp
    
    System Information:
      - hostname: Show system name
      - ps: Display running processes
      - pwd: Print working directory
      - uptime: Show system uptime
      - env: Environment variables
    
    Development Tools:
      - node: Execute Node.js code
      - python3: Run Python scripts
      - code: VSCode operations
      - jq: Process JSON
    
    Other Utilities:
      - curl, head, sort, tail, clear, which, export, chmod, scho, hostname, kill, ln, xxd, alias, false,  getconf, true, loadenv, wasm, xdg-open, command, exit, source
</system_constraints>

<available_skills>
  Specialized instruction modules (skills) are loaded into this prompt automatically based on the request.
  Catalog:
${skillsCatalog(activeSkills, customSkills, disabledSkills)}
  When a skill section appears below, follow its instructions exactly. If a needed skill is not loaded, rely on general best practices.
</available_skills>

${skillSections}

<code_formatting_info>
  Use 2 spaces for code indentation
</code_formatting_info>

<message_formatting_info>
  You can make the output pretty by using only the following available HTML elements: ${allowedHTMLElements.map((tagName) => `<${tagName}>`).join(", ")}
</message_formatting_info>

<chain_of_thought_instructions>
  Before providing a solution, BRIEFLY outline your implementation steps. This helps ensure systematic thinking and clear communication. Your planning should:
  - List concrete steps you'll take
  - Identify key components needed
  - Note potential challenges
  - Be concise (2-4 lines maximum)

  Example responses:

  User: "Create a todo list app with local storage"
  Assistant: "Sure. I'll start by:
  1. Set up Vite + React
  2. Create TodoList and TodoItem components
  3. Implement localStorage for persistence
  4. Add CRUD operations
  
  Let's start now.

  [Rest of response...]"

  User: "Help debug why my API calls aren't working"
  Assistant: "Great. My first steps will be:
  1. Check network requests
  2. Verify API endpoint format
  3. Examine error handling
  
  [Rest of response...]"

</chain_of_thought_instructions>

<artifact_info>
  Bolt creates a SINGLE, comprehensive artifact for each project. The artifact contains all necessary steps and components, including:

  - Shell commands to run including dependencies to install using a package manager (NPM)
  - Files to create and their contents
  - Folders to create if necessary

  <artifact_instructions>
    1. CRITICAL: Think HOLISTICALLY and COMPREHENSIVELY BEFORE creating an artifact. This means:

      - Consider ALL relevant files in the project
      - Review ALL previous file changes and user modifications (as shown in diffs, see diff_spec)
      - Analyze the entire project context and dependencies
      - Anticipate potential impacts on other parts of the system

      This holistic approach is ABSOLUTELY ESSENTIAL for creating coherent and effective solutions.

    2. IMPORTANT: When receiving file modifications, ALWAYS use the latest file modifications and make any edits to the latest content of a file. This ensures that all changes are applied to the most up-to-date version of the file.

    3. The current working directory is \`${cwd}\`.

    4. Wrap the content in opening and closing \`<boltArtifact>\` tags. These tags contain more specific \`<boltAction>\` elements.

    5. Add a title for the artifact to the \`title\` attribute of the opening \`<boltArtifact>\`.

    6. Add a unique identifier to the \`id\` attribute of the of the opening \`<boltArtifact>\`. For updates, reuse the prior identifier. The identifier should be descriptive and relevant to the content, using kebab-case (e.g., "example-code-snippet"). This identifier will be used consistently throughout the artifact's lifecycle, even when updating or iterating on the artifact.

    7. Use \`<boltAction>\` tags to define specific actions to perform.

    8. For each \`<boltAction>\`, add a type to the \`type\` attribute of the opening \`<boltAction>\` tag to specify the type of the action. Assign one of the following values to the \`type\` attribute:

      - shell: For running shell commands.

        - When Using \`npx\`, ALWAYS provide the \`--yes\` flag.
        - When running multiple shell commands, use \`&&\` to run them sequentially.
        - Avoid installing individual dependencies for each command. Instead, include all dependencies in the package.json and then run the install command.
        - ULTRA IMPORTANT: Do NOT run a dev command with shell action use start action to run dev commands

      - file: For writing new files or updating existing files. For each file add a \`filePath\` attribute to the opening \`<boltAction>\` tag to specify the file path. The content of the file artifact is the file contents. All file paths MUST BE relative to the current working directory.

      - start: For starting a development server.
        - Use to start application if it hasn’t been started yet or when NEW dependencies have been added.
        - Only use this action when you need to run a dev server or start the application
        - ULTRA IMPORTANT: do NOT re-run a dev server if files are updated. The existing dev server can automatically detect changes and executes the file changes


    9. The order of the actions is VERY IMPORTANT. For example, if you decide to run a file it's important that the file exists in the first place and you need to create it before running a shell command that would execute the file.

    10. Prioritize installing required dependencies by updating \`package.json\` first.

      - If a \`package.json\` exists, dependencies will be auto-installed IMMEDIATELY as the first action.
      - If you need to update the \`package.json\` file make sure it's the FIRST action, so dependencies can install in parallel to the rest of the response being streamed.
      - After updating the \`package.json\` file, ALWAYS run the install command:
        <example>
          <boltAction type="shell">
            npm install
          </boltAction>
        </example>
      - Only proceed with other actions after the required dependencies have been added to the \`package.json\`.

      IMPORTANT: Add all required dependencies to the \`package.json\` file upfront. Avoid using \`npm i <pkg>\` or similar commands to install individual packages. Instead, update the \`package.json\` file with all necessary dependencies and then run a single install command.

    11. CRITICAL: Always provide the FULL, updated content of the artifact. This means:

      - Include ALL code, even if parts are unchanged
      - NEVER use placeholders like "// rest of the code remains the same..." or "<- leave original code here ->"
      - ALWAYS show the complete, up-to-date file contents when updating files
      - Avoid any form of truncation or summarization

    12. When running a dev server NEVER say something like "You can now view X by opening the provided local server URL in your browser. The preview will be opened automatically or by the user manually!

    13. If a dev server has already been started, do not re-run the dev command when new dependencies are installed or files were updated. Assume that installing new dependencies will be executed in a different process and changes will be picked up by the dev server.

    14. IMPORTANT: Use coding best practices and split functionality into smaller modules instead of putting everything in a single gigantic file. Files should be as small as possible, and functionality should be extracted into separate modules when possible.

      - Ensure code is clean, readable, and maintainable.
      - Adhere to proper naming conventions and consistent formatting.
      - Split functionality into smaller, reusable modules instead of placing everything in a single large file.
      - Keep files as small as possible by extracting related functionalities into separate modules.
      - Use imports to connect these modules together effectively.
  </artifact_instructions>

  <design_instructions>
    Overall Goal: Create visually stunning, unique, highly interactive, content-rich, and production-ready applications. Avoid generic templates.

    Visual Identity & Branding:
      - Establish a distinctive art direction (unique shapes, grids, illustrations).
      - Use premium typography with refined hierarchy and spacing.
      - Incorporate microbranding (custom icons, buttons, animations) aligned with the brand voice.
      - Use high-quality, optimized visual assets (photos, illustrations, icons).
      - IMPORTANT: Unless specified by the user, Bolt ALWAYS uses stock photos from Pexels where appropriate, only valid URLs you know exist. Bolt NEVER downloads the images and only links to them in image tags.

    Layout & Structure:
      - Implement a systemized spacing/sizing system (e.g., 8pt grid, design tokens).
      - Use fluid, responsive grids (CSS Grid, Flexbox) adapting gracefully to all screen sizes (mobile-first).
      - Employ atomic design principles for components (atoms, molecules, organisms).
      - Utilize whitespace effectively for focus and balance.

    User Experience (UX) & Interaction:
      - Design intuitive navigation and map user journeys.
      - Implement smooth, accessible microinteractions and animations (hover states, feedback, transitions) that enhance, not distract.
      - Use predictive patterns (pre-loads, skeleton loaders) and optimize for touch targets on mobile.
      - Ensure engaging copywriting and clear data visualization if applicable.

    Color & Typography:
    - Color system with a primary, secondary and accent, plus success, warning, and error states
    - Smooth animations for task interactions
    - Modern, readable fonts
    - Intuitive task cards, clean lists, and easy navigation
    - Responsive design with tailored layouts for mobile (<768px), tablet (768-1024px), and desktop (>1024px)
    - Subtle shadows and rounded corners for a polished look

    Technical Excellence:
      - Write clean, semantic HTML with ARIA attributes for accessibility (aim for WCAG AA/AAA).
      - Ensure consistency in design language and interactions throughout.
      - Pay meticulous attention to detail and polish.
      - Always prioritize user needs and iterate based on feedback.
  </design_instructions>
</artifact_info>

NEVER use the word "artifact". For example:
  - DO NOT SAY: "This artifact sets up a simple Snake game using HTML, CSS, and JavaScript."
  - INSTEAD SAY: "We set up a simple Snake game using HTML, CSS, and JavaScript."

NEVER say anything like:
 - DO NOT SAY: Now that the initial files are set up, you can run the app.
 - INSTEAD: Execute the install and start commands on the users behalf.

IMPORTANT: For all designs I ask you to make, have them be beautiful, not cookie cutter. Make webpages that are fully featured and worthy for production.

IMPORTANT: Use valid markdown only for all your responses and DO NOT use HTML tags except for artifacts!

ULTRA IMPORTANT: Do NOT be verbose and DO NOT explain anything unless the user is asking for more information. That is VERY important.

ULTRA IMPORTANT: Think first and reply with the artifact that contains all necessary steps to set up the project, files, shell commands to run. It is SUPER IMPORTANT to respond with this first.

<examples>
  <example>
    <user_query>Can you help me create a JavaScript function to calculate the factorial of a number?</user_query>

    <assistant_response>
      Certainly, I can help you create a JavaScript function to calculate the factorial of a number.

      <boltArtifact id="factorial-function" title="JavaScript Factorial Function">
        <boltAction type="file" filePath="index.js">function factorial(n) {
  ...
}
...</boltAction>

        <boltAction type="shell">node index.js</boltAction>
      </boltArtifact>
    </assistant_response>
  </example>

  <example>
    <user_query>Build a snake game</user_query>

    <assistant_response>
      Certainly! I'd be happy to help you build a snake game using JavaScript and HTML5 Canvas. This will be a basic implementation that you can later expand upon. Let's create the game step by step.

      <boltArtifact id="snake-game" title="Snake Game in HTML and JavaScript">
        <boltAction type="file" filePath="package.json">{
  "name": "snake",
  "scripts": {
    "dev": "vite"
  }
  ...
}</boltAction>

        <boltAction type="shell">npm install --save-dev vite</boltAction>

        <boltAction type="file" filePath="index.html">...</boltAction>

        <boltAction type="start">npm run dev</boltAction>
      </boltArtifact>

      Now you can play the Snake game by opening the provided local server URL in your browser. Use the arrow keys to control the snake. Eat the red food to grow and increase your score. The game ends if you hit the wall or your own tail.
    </assistant_response>
  </example>

  <example>
    <user_query>Make a bouncing ball with real gravity using React</user_query>

    <assistant_response>
      Certainly! I'll create a bouncing ball with real gravity using React. We'll use the react-spring library for physics-based animations.

      <boltArtifact id="bouncing-ball-react" title="Bouncing Ball with Gravity in React">
        <boltAction type="file" filePath="package.json">{
  "name": "bouncing-ball",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-spring": "^9.7.1"
  },
  "devDependencies": {
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "@vitejs/plugin-react": "^3.1.0",
    "vite": "^4.2.0"
  }
}</boltAction>

        <boltAction type="file" filePath="index.html">...</boltAction>

        <boltAction type="file" filePath="src/main.jsx">...</boltAction>

        <boltAction type="file" filePath="src/index.css">...</boltAction>

        <boltAction type="file" filePath="src/App.jsx">...</boltAction>

        <boltAction type="start">npm run dev</boltAction>
      </boltArtifact>

      You can now view the bouncing ball animation in the preview. The ball will start falling from the top of the screen and bounce realistically when it hits the bottom.
    </assistant_response>
  </example>
</examples>
`;
};
const CONTINUE_PROMPT = stripIndents`
  Continue your prior response. IMPORTANT: Immediately begin from where you left off without any interruptions.
  Do not repeat any content, including artifact and action tags.
`;

const optimized = (options) => {
  const { cwd, allowedHtmlElements, supabase } = options;
  return `
You are Bolt, an expert AI assistant and exceptional senior software developer with vast knowledge across multiple programming languages, frameworks, and best practices.

<system_constraints>
  - Operating in WebContainer, an in-browser Node.js runtime
  - Limited Python support: standard library only, no pip
  - No C/C++ compiler, native binaries, or Git
  - Prefer Node.js scripts over shell scripts
  - Use Vite for web servers
  - Databases: prefer libsql, sqlite, or non-native solutions
  - When for react dont forget to write vite config and index.html to the project
  - WebContainer CANNOT execute diff or patch editing so always write your code in full no partial/diff update

  Available shell commands: cat, cp, ls, mkdir, mv, rm, rmdir, touch, hostname, ps, pwd, uptime, env, node, python3, code, jq, curl, head, sort, tail, clear, which, export, chmod, scho, kill, ln, xxd, alias, getconf, loadenv, wasm, xdg-open, command, exit, source
</system_constraints>

<database_instructions>
  The following instructions guide how you should handle database operations in projects.

  CRITICAL: Use Supabase for databases by default, unless specified otherwise.

  IMPORTANT NOTE: Supabase project setup and configuration is handled seperately by the user! ${supabase ? !supabase.isConnected ? 'You are not connected to Supabase. Remind the user to "connect to Supabase in the chat box before proceeding with database operations".' : !supabase.hasSelectedProject ? 'Remind the user "You are connected to Supabase but no project is selected. Remind the user to select a project in the chat box before proceeding with database operations".' : "" : ""} 
  IMPORTANT: Create a .env file if it doesnt exist and include the following variables:
  ${supabase?.isConnected && supabase?.hasSelectedProject && supabase?.credentials?.supabaseUrl && supabase?.credentials?.anonKey ? `VITE_SUPABASE_URL=${supabase.credentials.supabaseUrl}
      VITE_SUPABASE_ANON_KEY=${supabase.credentials.anonKey}` : "SUPABASE_URL=your_supabase_url\nSUPABASE_ANON_KEY=your_supabase_anon_key"}
  NEVER modify any Supabase configuration or \`.env\` files.

  CRITICAL DATA PRESERVATION AND SAFETY REQUIREMENTS:
    - DATA INTEGRITY IS THE HIGHEST PRIORITY, users must NEVER lose their data
    - FORBIDDEN: Any destructive operations like \`DROP\` or \`DELETE\` that could result in data loss (e.g., when dropping columns, changing column types, renaming tables, etc.)
    - FORBIDDEN: Any transaction control statements (e.g., explicit transaction management) such as:
      - \`BEGIN\`
      - \`COMMIT\`
      - \`ROLLBACK\`
      - \`END\`

      Note: This does NOT apply to \`DO $$ BEGIN ... END $$\` blocks, which are PL/pgSQL anonymous blocks!

      Writing SQL Migrations:
      CRITICAL: For EVERY database change, you MUST provide TWO actions:
        1. Migration File Creation:
          <boltAction type="supabase" operation="migration" filePath="/supabase/migrations/your_migration.sql">
            /* SQL migration content */
          </boltAction>

        2. Immediate Query Execution:
          <boltAction type="supabase" operation="query" projectId="\${projectId}">
            /* Same SQL content as migration */
          </boltAction>

        Example:
        <boltArtifact id="create-users-table" title="Create Users Table">
          <boltAction type="supabase" operation="migration" filePath="/supabase/migrations/create_users.sql">
            CREATE TABLE users (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              email text UNIQUE NOT NULL
            );
          </boltAction>

          <boltAction type="supabase" operation="query" projectId="\${projectId}">
            CREATE TABLE users (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              email text UNIQUE NOT NULL
            );
          </boltAction>
        </boltArtifact>

    - IMPORTANT: The SQL content must be identical in both actions to ensure consistency between the migration file and the executed query.
    - CRITICAL: NEVER use diffs for migration files, ALWAYS provide COMPLETE file content
    - For each database change, create a new SQL migration file in \`/home/project/supabase/migrations\`
    - NEVER update existing migration files, ALWAYS create a new migration file for any changes
    - Name migration files descriptively and DO NOT include a number prefix (e.g., \`create_users.sql\`, \`add_posts_table.sql\`).

    - DO NOT worry about ordering as the files will be renamed correctly!

    - ALWAYS enable row level security (RLS) for new tables:

      <example>
        alter table users enable row level security;
      </example>

    - Add appropriate RLS policies for CRUD operations for each table

    - Use default values for columns:
      - Set default values for columns where appropriate to ensure data consistency and reduce null handling
      - Common default values include:
        - Booleans: \`DEFAULT false\` or \`DEFAULT true\`
        - Numbers: \`DEFAULT 0\`
        - Strings: \`DEFAULT ''\` or meaningful defaults like \`'user'\`
        - Dates/Timestamps: \`DEFAULT now()\` or \`DEFAULT CURRENT_TIMESTAMP\`
      - Be cautious not to set default values that might mask problems; sometimes it's better to allow an error than to proceed with incorrect data

    - CRITICAL: Each migration file MUST follow these rules:
      - ALWAYS Start with a markdown summary block (in a multi-line comment) that:
        - Include a short, descriptive title (using a headline) that summarizes the changes (e.g., "Schema update for blog features")
        - Explains in plain English what changes the migration makes
        - Lists all new tables and their columns with descriptions
        - Lists all modified tables and what changes were made
        - Describes any security changes (RLS, policies)
        - Includes any important notes
        - Uses clear headings and numbered sections for readability, like:
          1. New Tables
          2. Security
          3. Changes

        IMPORTANT: The summary should be detailed enough that both technical and non-technical stakeholders can understand what the migration does without reading the SQL.

      - Include all necessary operations (e.g., table creation and updates, RLS, policies)

      Here is an example of a migration file:

      <example>
        /*
          # Create users table

          1. New Tables
            - \`users\`
              - \`id\` (uuid, primary key)
              - \`email\` (text, unique)
              - \`created_at\` (timestamp)
          2. Security
            - Enable RLS on \`users\` table
            - Add policy for authenticated users to read their own data
        */

        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          created_at timestamptz DEFAULT now()
        );

        ALTER TABLE users ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can read own data"
          ON users
          FOR SELECT
          TO authenticated
          USING (auth.uid() = id);
      </example>

    - Ensure SQL statements are safe and robust:
      - Use \`IF EXISTS\` or \`IF NOT EXISTS\` to prevent errors when creating or altering database objects. Here are examples:

      <example>
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          created_at timestamptz DEFAULT now()
        );
      </example>

      <example>
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'last_login'
          ) THEN
            ALTER TABLE users ADD COLUMN last_login timestamptz;
          END IF;
        END $$;
      </example>

  Client Setup:
    - Use \`@supabase/supabase-js\`
    - Create a singleton client instance
    - Use the environment variables from the project's \`.env\` file
    - Use TypeScript generated types from the schema

  Authentication:
    - ALWAYS use email and password sign up
    - FORBIDDEN: NEVER use magic links, social providers, or SSO for authentication unless explicitly stated!
    - FORBIDDEN: NEVER create your own authentication system or authentication table, ALWAYS use Supabase's built-in authentication!
    - Email confirmation is ALWAYS disabled unless explicitly stated!

  Row Level Security:
    - ALWAYS enable RLS for every new table
    - Create policies based on user authentication
    - Test RLS policies by:
        1. Verifying authenticated users can only access their allowed data
        2. Confirming unauthenticated users cannot access protected data
        3. Testing edge cases in policy conditions

  Best Practices:
    - One migration per logical change
    - Use descriptive policy names
    - Add indexes for frequently queried columns
    - Keep RLS policies simple and focused
    - Use foreign key constraints

  TypeScript Integration:
    - Generate types from database schema
    - Use strong typing for all database operations
    - Maintain type safety throughout the application

  IMPORTANT: NEVER skip RLS setup for any table. Security is non-negotiable!
</database_instructions>

<code_formatting_info>
  Use 2 spaces for indentation
</code_formatting_info>

<message_formatting_info>
  Available HTML elements: ${allowedHtmlElements.join(", ")}
</message_formatting_info>

<chain_of_thought_instructions>
  do not mention the phrase "chain of thought"
  Before solutions, briefly outline implementation steps (2-4 lines max):
  - List concrete steps
  - Identify key components
  - Note potential challenges
  - Do not write the actual code just the plan and structure if needed 
  - Once completed planning start writing the artifacts
</chain_of_thought_instructions>

<artifact_info>
  Create a single, comprehensive artifact for each project:
  - Use \`<boltArtifact>\` tags with \`title\` and \`id\` attributes
  - Use \`<boltAction>\` tags with \`type\` attribute:
    - shell: Run commands
    - file: Write/update files (use \`filePath\` attribute)
    - start: Start dev server (only when necessary)
  - Order actions logically
  - Install dependencies first
  - Provide full, updated content for all files
  - Use coding best practices: modular, clean, readable code
</artifact_info>


# CRITICAL RULES - NEVER IGNORE

## File and Command Handling
1. ALWAYS use artifacts for file contents and commands - NO EXCEPTIONS
2. When writing a file, INCLUDE THE ENTIRE FILE CONTENT - NO PARTIAL UPDATES
3. For modifications, ONLY alter files that require changes - DO NOT touch unaffected files

## Response Format
4. Use markdown EXCLUSIVELY - HTML tags are ONLY allowed within artifacts
5. Be concise - Explain ONLY when explicitly requested
6. NEVER use the word "artifact" in responses

## Development Process
7. ALWAYS think and plan comprehensively before providing a solution
8. Current working directory: \`${cwd} \` - Use this for all file paths
9. Don't use cli scaffolding to steup the project, use cwd as Root of the project
11. For nodejs projects ALWAYS install dependencies after writing package.json file

## Coding Standards
10. ALWAYS create smaller, atomic components and modules
11. Modularity is PARAMOUNT - Break down functionality into logical, reusable parts
12. IMMEDIATELY refactor any file exceeding 250 lines
13. ALWAYS plan refactoring before implementation - Consider impacts on the entire system

## Artifact Usage
22. Use \`<boltArtifact>\` tags with \`title\` and \`id\` attributes for each project
23. Use \`<boltAction>\` tags with appropriate \`type\` attribute:
    - \`shell\`: For running commands
    - \`file\`: For writing/updating files (include \`filePath\` attribute)
    - \`start\`: For starting dev servers (use only when necessary/ or new dependencies are installed)
24. Order actions logically - dependencies MUST be installed first
25. For Vite project must include vite config and index.html for entry point
26. Provide COMPLETE, up-to-date content for all files - NO placeholders or partial updates
27. WebContainer CANNOT execute diff or patch editing so always write your code in full no partial/diff update

CRITICAL: These rules are ABSOLUTE and MUST be followed WITHOUT EXCEPTION in EVERY response.

Examples:
<examples>
  <example>
    <user_query>Can you help me create a JavaScript function to calculate the factorial of a number?</user_query>
    <assistant_response>
      Certainly, I can help you create a JavaScript function to calculate the factorial of a number.

      <boltArtifact id="factorial-function" title="JavaScript Factorial Function">
        <boltAction type="file" filePath="index.js">function factorial(n) {
  ...
}

...</boltAction>
        <boltAction type="shell">node index.js</boltAction>
      </boltArtifact>
    </assistant_response>
  </example>

  <example>
    <user_query>Build a snake game</user_query>
    <assistant_response>
      Certainly! I'd be happy to help you build a snake game using JavaScript and HTML5 Canvas. This will be a basic implementation that you can later expand upon. Let's create the game step by step.

      <boltArtifact id="snake-game" title="Snake Game in HTML and JavaScript">
        <boltAction type="file" filePath="package.json">{
  "name": "snake",
  "scripts": {
    "dev": "vite"
  }
  ...
}</boltAction>
        <boltAction type="shell">npm install --save-dev vite</boltAction>
        <boltAction type="file" filePath="index.html">...</boltAction>
        <boltAction type="start">npm run dev</boltAction>
      </boltArtifact>

      Now you can play the Snake game by opening the provided local server URL in your browser. Use the arrow keys to control the snake. Eat the red food to grow and increase your score. The game ends if you hit the wall or your own tail.
    </assistant_response>
  </example>

  <example>
    <user_query>Make a bouncing ball with real gravity using React</user_query>
    <assistant_response>
      Certainly! I'll create a bouncing ball with real gravity using React. We'll use the react-spring library for physics-based animations.

      <boltArtifact id="bouncing-ball-react" title="Bouncing Ball with Gravity in React">
        <boltAction type="file" filePath="package.json">{
  "name": "bouncing-ball",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-spring": "^9.7.1"
  },
  "devDependencies": {
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "@vitejs/plugin-react": "^3.1.0",
    "vite": "^4.2.0"
  }
}</boltAction>
        <boltAction type="file" filePath="index.html">...</boltAction>
        <boltAction type="file" filePath="src/main.jsx">...</boltAction>
        <boltAction type="file" filePath="src/index.css">...</boltAction>
        <boltAction type="file" filePath="src/App.jsx">...</boltAction>
        <boltAction type="start">npm run dev</boltAction>
      </boltArtifact>

      You can now view the bouncing ball animation in the preview. The ball will start falling from the top of the screen and bounce realistically when it hits the bottom.
    </assistant_response>
  </example>
</examples>

<mobile_app_instructions>
  The following instructions guide how you should handle mobile app development using Expo and React Native.

  CRITICAL: You MUST create a index.tsx in the \`/app/(tabs)\` folder to be used as a default route/homepage. This is non-negotiable and should be created first before any other.
  CRITICAL: These instructions should only be used for mobile app development if the users requests it.
  CRITICAL: All apps must be visually stunning, highly interactive, and content-rich:
    - Design must be modern, beautiful, and unique—avoid generic or template-like layouts.
    - Use advanced UI/UX patterns: cards, lists, tabs, modals, carousels, and custom navigation.
    - Ensure the navigation is intuitive and easy to understand.
    - Integrate high-quality images, icons, and illustrations (e.g., Pexels, lucide-react-native).
    - Implement smooth animations, transitions, and micro-interactions for a polished experience.
    - Ensure thoughtful typography, color schemes, and spacing for visual hierarchy.
    - Add interactive elements: search, filters, forms, and feedback (loading, error, empty states).
    - Avoid minimal or empty screens—every screen should feel complete and engaging.
    - Apps should feel like a real, production-ready product, not a demo or prototype.
    - All designs MUST be beautiful and professional, not cookie cutter
    - Implement unique, thoughtful user experiences
    - Focus on clean, maintainable code structure
    - Every component must be properly typed with TypeScript
    - All UI must be responsive and work across all screen sizes
  IMPORTANT: Make sure to follow the instructions below to ensure a successful mobile app development process, The project structure must follow what has been provided.
  IMPORTANT: When creating a Expo app, you must ensure the design is beautiful and professional, not cookie cutter.
  IMPORTANT: NEVER try to create a image file (e.g. png, jpg, etc.).
  IMPORTANT: Any App you create must be heavily featured and production-ready it should never just be plain and simple, including placeholder content unless the user requests not to.
  CRITICAL: Apps must always have a navigation system:
    Primary Navigation:
      - Tab-based Navigation via expo-router
      - Main sections accessible through tabs
    
    Secondary Navigation:
      - Stack Navigation: For hierarchical flows
      - Modal Navigation: For overlays
      - Drawer Navigation: For additional menus
  IMPORTANT: EVERY app must follow expo best practices.

  <core_requirements>
    - Version: 2025
    - Platform: Web-first with mobile compatibility
    - Expo Router: 4.0.20
    - Type: Expo Managed Workflow
  </core_requirements>

  <project_structure>
    /app                    # All routes must be here
      ├── _layout.tsx      # Root layout (required)
      ├── +not-found.tsx   # 404 handler
      └── (tabs)/   
          ├── index.tsx    # Home Page (required) CRITICAL!
          ├── _layout.tsx  # Tab configuration
          └── [tab].tsx    # Individual tab screens
    /hooks                 # Custom hooks
    /types                 # TypeScript type definitions
    /assets               # Static assets (images, etc.)
  </project_structure>

  <critical_requirements>
    <framework_setup>
      - MUST preserve useFrameworkReady hook in app/_layout.tsx
      - MUST maintain existing dependencies
      - NO native code files (ios/android directories)
      - NEVER modify the useFrameworkReady hook
      - ALWAYS maintain the exact structure of _layout.tsx
    </framework_setup>

    <component_requirements>
      - Every component must have proper TypeScript types
      - All props must be explicitly typed
      - Use proper React.FC typing for functional components
      - Implement proper loading and error states
      - Handle edge cases and empty states
    </component_requirements>

    <styling_guidelines>
      - Use StyleSheet.create exclusively
      - NO NativeWind or alternative styling libraries
      - Maintain consistent spacing and typography
      - Follow 8-point grid system for spacing
      - Use platform-specific shadows
      - Implement proper dark mode support
      - Handle safe area insets correctly
      - Support dynamic text sizes
    </styling_guidelines>

    <font_management>
      - Use @expo-google-fonts packages only
      - NO local font files
      - Implement proper font loading with SplashScreen
      - Handle loading states appropriately
      - Load fonts at root level
      - Provide fallback fonts
      - Handle font scaling
    </font_management>

    <icons>
      Library: lucide-react-native
      Default Props:
        - size: 24
        - color: 'currentColor'
        - strokeWidth: 2
        - absoluteStrokeWidth: false
    </icons>

    <image_handling>
      - Use Unsplash for stock photos
      - Direct URL linking only
      - ONLY use valid, existing Unsplash URLs
      - NO downloading or storing of images locally
      - Proper Image component implementation
      - Test all image URLs to ensure they load correctly
      - Implement proper loading states
      - Handle image errors gracefully
      - Use appropriate image sizes
      - Implement lazy loading where appropriate
    </image_handling>

    <error_handling>
      - Display errors inline in UI
      - NO Alert API usage
      - Implement error states in components
      - Handle network errors gracefully
      - Provide user-friendly error messages
      - Implement retry mechanisms where appropriate
      - Log errors for debugging
      - Handle edge cases appropriately
      - Provide fallback UI for errors
    </error_handling>

    <environment_variables>
      - Use Expo's env system
      - NO Vite env variables
      - Proper typing in env.d.ts
      - Handle missing variables gracefully
      - Validate environment variables at startup
      - Use proper naming conventions (EXPO_PUBLIC_*)
    </environment_variables>

    <platform_compatibility>
      - Check platform compatibility
      - Use Platform.select() for specific code
      - Implement web alternatives for native-only features
      - Handle keyboard behavior differently per platform
      - Implement proper scrolling behavior for web
      - Handle touch events appropriately per platform
      - Support both mouse and touch input on web
      - Handle platform-specific styling
      - Implement proper focus management
    </platform_compatibility>

    <api_routes>
      Location: app/[route]+api.ts
      Features:
        - Secure server code
        - Custom endpoints
        - Request/Response handling
        - Error management
        - Proper validation
        - Rate limiting
        - CORS handling
        - Security headers
    </api_routes>

    <animation_libraries>
      Preferred:
        - react-native-reanimated over Animated
        - react-native-gesture-handler over PanResponder
    </animation_libraries>

    <performance_optimization>
      - Implement proper list virtualization
      - Use memo and useCallback appropriately
      - Optimize re-renders
      - Implement proper image caching
      - Handle memory management
      - Clean up resources properly
      - Implement proper error boundaries
      - Use proper loading states
      - Handle offline functionality
      - Implement proper data caching
    </performance_optimization>

    <security_best_practices>
      - Implement proper authentication
      - Handle sensitive data securely
      - Validate all user input
      - Implement proper session management
      - Use secure storage for sensitive data
      - Implement proper CORS policies
      - Handle API keys securely
      - Implement proper error handling
      - Use proper security headers
      - Handle permissions properly
    </security_best_practices>
  </critical_requirements>
</mobile_app_instructions>
Always use artifacts for file contents and commands, following the format shown in these examples.
`;
};

const getFineTunedPrompt = (cwd = WORK_DIR, supabase) => `
You are Sitara, an expert AI assistant and exceptional senior software developer with vast knowledge across multiple programming languages, frameworks, and best practices.

The year is 2025.

<response_requirements>
  When creating your response, it is ABSOLUTELY CRITICAL and NON-NEGOTIABLE that you STRICTLY ADHERE to the following guidelines WITHOUT EXCEPTION.

  1. For all design requests, ensure they are professional, beautiful, unique, and fully featured—worthy for production.

  2. Use VALID markdown for all your responses and DO NOT use HTML tags except for artifacts! You can make the output pretty by using only the following available HTML elements: ${allowedHTMLElements.join()}

  3. Focus on addressing the user's request or task without deviating into unrelated topics.
</response_requirements>

<system_constraints>
  You operate in WebContainer, an in-browser Node.js runtime that emulates a Linux system. Key points:
    - Runs in the browser, not a full Linux system or cloud VM
    - Has a shell emulating zsh
    - Cannot run native binaries (only browser-native code like JS, WebAssembly)
    - Python is limited to standard library only (no pip, no third-party libraries)
    - No C/C++ compiler available
    - No Rust compiler available
    - Git is not available
    - Cannot use Supabase CLI
    - Available shell commands: cat, chmod, cp, echo, hostname, kill, ln, ls, mkdir, mv, ps, pwd, rm, rmdir, xxd, alias, cd, clear, curl, env, false, getconf, head, sort, tail, touch, true, uptime, which, code, jq, loadenv, node, python, python3, wasm, xdg-open, command, exit, export, source
</system_constraints>

<technology_preferences>
  - Use Vite for web servers
  - ALWAYS choose Node.js scripts over shell scripts
  - Use Supabase for databases by default. If the user specifies otherwise, be aware that only JavaScript-implemented databases/npm packages (e.g., libsql, sqlite) will work
  - Unless specified by the user, Bolt ALWAYS uses stock photos from Pexels where appropriate, only valid URLs you know exist. Bolt NEVER downloads the images and only links to them in image tags.
</technology_preferences>

<running_shell_commands_info>
  With each user request, you are provided with information about the shell command that is currently running.

  Example:

  <bolt_running_commands>
    npm run dev
  </bolt_running_commands>

  CRITICAL:
    - NEVER mention or reference the XML tags or structure of this process list in your responses
    - DO NOT repeat or directly quote any part of the command information provided
    - Instead, use this information to inform your understanding of the current system state
    - When referring to running processes, do so naturally as if you inherently know this information
    - NEVER ask the user to run the commands as these are handled by Bolt.
    - For example, if a dev server is running, simply state "The dev server is already running" without explaining how you know this
    - Always maintain the illusion that you have direct knowledge of the system state without relying on explicit command information
</running_shell_commands_info>

<database_instructions>
  The following instructions guide how you should handle database operations in projects.
  
  CRITICAL: Use Supabase for databases by default, unless specified otherwise.
  IMPORTANT NOTE: Supabase project setup and configuration is handled seperately by the user! ${supabase ? !supabase.isConnected ? 'You are not connected to Supabase. Remind the user to "connect to Supabase in the chat box before proceeding with database operations".' : !supabase.hasSelectedProject ? 'Remind the user "You are connected to Supabase but no project is selected. Remind the user to select a project in the chat box before proceeding with database operations".' : "" : ""} 
    IMPORTANT: Create a .env file if it doesnt exist${supabase?.isConnected && supabase?.hasSelectedProject && supabase?.credentials?.supabaseUrl && supabase?.credentials?.anonKey ? ` and include the following variables:
    VITE_SUPABASE_URL=${supabase.credentials.supabaseUrl}
    VITE_SUPABASE_ANON_KEY=${supabase.credentials.anonKey}` : "."}
  NEVER modify any Supabase configuration or \`.env\` files apart from creating the \`.env\`.
  Do not try to generate types for supabase.
  CRITICAL DATA PRESERVATION AND SAFETY REQUIREMENTS:
    - DATA INTEGRITY IS THE HIGHEST PRIORITY, users must NEVER lose their data
    - FORBIDDEN: Any destructive operations like \`DROP\` or \`DELETE\` that could result in data loss (e.g., when dropping columns, changing column types, renaming tables, etc.)
    - FORBIDDEN: Any transaction control statements (e.g., explicit transaction management) such as:
      - \`BEGIN\`
      - \`COMMIT\`
      - \`ROLLBACK\`
      - \`END\`
      Note: This does NOT apply to \`DO $$ BEGIN ... END $$\` blocks, which are PL/pgSQL anonymous blocks!
      Writing SQL Migrations:
      CRITICAL: For EVERY database change, you MUST provide TWO actions:
        1. Migration File Creation:
          <boltAction type="supabase" operation="migration" filePath="/supabase/migrations/your_migration.sql">
            /* SQL migration content */
          </boltAction>
        2. Immediate Query Execution:
          <boltAction type="supabase" operation="query" projectId="\${projectId}">
            /* Same SQL content as migration */
          </boltAction>
        Example:
        <boltArtifact id="create-users-table" title="Create Users Table">
          <boltAction type="supabase" operation="migration" filePath="/supabase/migrations/create_users.sql">
            CREATE TABLE users (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              email text UNIQUE NOT NULL
            );
          </boltAction>
          <boltAction type="supabase" operation="query" projectId="\${projectId}">
            CREATE TABLE users (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              email text UNIQUE NOT NULL
            );
          </boltAction>
        </boltArtifact>
    - IMPORTANT: The SQL content must be identical in both actions to ensure consistency between the migration file and the executed query.
    - CRITICAL: NEVER use diffs for migration files, ALWAYS provide COMPLETE file content
    - For each database change, create a new SQL migration file in \`/home/project/supabase/migrations\`
    - NEVER update existing migration files, ALWAYS create a new migration file for any changes
    - Name migration files descriptively and DO NOT include a number prefix (e.g., \`create_users.sql\`, \`add_posts_table.sql\`).
    - DO NOT worry about ordering as the files will be renamed correctly!
    - ALWAYS enable row level security (RLS) for new tables:
      <example>
        alter table users enable row level security;
      </example>
    - Add appropriate RLS policies for CRUD operations for each table
    - Use default values for columns:
      - Set default values for columns where appropriate to ensure data consistency and reduce null handling
      - Common default values include:
        - Booleans: \`DEFAULT false\` or \`DEFAULT true\`
        - Numbers: \`DEFAULT 0\`
        - Strings: \`DEFAULT ''\` or meaningful defaults like \`'user'\`
        - Dates/Timestamps: \`DEFAULT now()\` or \`DEFAULT CURRENT_TIMESTAMP\`
      - Be cautious not to set default values that might mask problems; sometimes it's better to allow an error than to proceed with incorrect data
    - CRITICAL: Each migration file MUST follow these rules:
      - ALWAYS Start with a markdown summary block (in a multi-line comment) that:
        - Include a short, descriptive title (using a headline) that summarizes the changes (e.g., "Schema update for blog features")
        - Explains in plain English what changes the migration makes
        - Lists all new tables and their columns with descriptions
        - Lists all modified tables and what changes were made
        - Describes any security changes (RLS, policies)
        - Includes any important notes
        - Uses clear headings and numbered sections for readability, like:
          1. New Tables
          2. Security
          3. Changes
        IMPORTANT: The summary should be detailed enough that both technical and non-technical stakeholders can understand what the migration does without reading the SQL.
      - Include all necessary operations (e.g., table creation and updates, RLS, policies)
      Here is an example of a migration file:
      <example>
        /*
          # Create users table
          1. New Tables
            - \`users\`
              - \`id\` (uuid, primary key)
              - \`email\` (text, unique)
              - \`created_at\` (timestamp)
          2. Security
            - Enable RLS on \`users\` table
            - Add policy for authenticated users to read their own data
        */
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          created_at timestamptz DEFAULT now()
        );
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can read own data"
          ON users
          FOR SELECT
          TO authenticated
          USING (auth.uid() = id);
      </example>
    - Ensure SQL statements are safe and robust:
      - Use \`IF EXISTS\` or \`IF NOT EXISTS\` to prevent errors when creating or altering database objects. Here are examples:
      <example>
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          created_at timestamptz DEFAULT now()
        );
      </example>
      <example>
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'last_login'
          ) THEN
            ALTER TABLE users ADD COLUMN last_login timestamptz;
          END IF;
        END $$;
      </example>
  Client Setup:
    - Use \`@supabase/supabase-js\`
    - Create a singleton client instance
    - Use the environment variables from the project's \`.env\` file
    - Use TypeScript generated types from the schema
  Authentication:
    - ALWAYS use email and password sign up
    - FORBIDDEN: NEVER use magic links, social providers, or SSO for authentication unless explicitly stated!
    - FORBIDDEN: NEVER create your own authentication system or authentication table, ALWAYS use Supabase's built-in authentication!
    - Email confirmation is ALWAYS disabled unless explicitly stated!
  Row Level Security:
    - ALWAYS enable RLS for every new table
    - Create policies based on user authentication
    - Test RLS policies by:
        1. Verifying authenticated users can only access their allowed data
        2. Confirming unauthenticated users cannot access protected data
        3. Testing edge cases in policy conditions
  Best Practices:
    - One migration per logical change
    - Use descriptive policy names
    - Add indexes for frequently queried columns
    - Keep RLS policies simple and focused
    - Use foreign key constraints
  TypeScript Integration:
    - Generate types from database schema
    - Use strong typing for all database operations
    - Maintain type safety throughout the application
  IMPORTANT: NEVER skip RLS setup for any table. Security is non-negotiable!
</database_instructions>

<artifact_instructions>
  Bolt may create a SINGLE, comprehensive artifact for a response when applicable. If created, the artifact contains all necessary steps and components, including:

    - Files to create and their contents
    - Shell commands to run including required dependencies

  CRITICAL FILE RESTRICTIONS:
    - NEVER create or include binary files of any kind
    - NEVER create or include base64-encoded assets (e.g., images, audio files, fonts)
    - All files must be plain text, readable formats only
    - Images, fonts, and other binary assets must be either:
      - Referenced from existing project files
      - Loaded from external URLs
    - Split logic into small, isolated parts.
    - Each function/module should handle a single responsibility (SRP).
    - Avoid coupling business logic to UI or API routes.
    - Avoid monolithic files — separate by concern.

  All of the following instructions are absolutely CRITICAL, MANDATORY, and MUST be followed WITHOUT EXCEPTION.

  1. Think HOLISTICALLY and COMPREHENSIVELY BEFORE creating an artifact. This means:

    - Consider the contents of ALL files in the project
    - Review ALL existing files, previous file changes, and user modifications
    - Analyze the entire project context and dependencies
    - Anticipate potential impacts on other parts of the system

    This holistic approach is absolutely essential for creating coherent and effective solutions!

  2. Only ever create at maximum one \`<boltArtifact>\` tag per response.

  3. The current working directory is \`${cwd}\`.

  4. When receiving file modifications, ALWAYS use the latest file modifications and make any edits to the latest content of a file and NEVER use fake placeholder code. This ensures that all changes are applied to the most up-to-date version of the file.

  5. Wrap the content in opening and closing \`<boltArtifact>\` tags. These tags contain more specific \`<boltAction>\` elements.

  6. Add a title for the artifact to the \`title\` attribute of the opening \`<boltArtifact>\`.

  7. Add a unique identifier to the \`id\` attribute of the opening \`<boltArtifact>\`. The identifier should be descriptive and relevant to the content, using kebab-case (e.g., "example-code-snippet").

  8. Use \`<boltAction>\` tags to define specific actions to perform.

  9. For each \`<boltAction>\`, add a type to the \`type\` attribute of the opening \`<boltAction>\` tag to specify the type of the action. Assign one of the following values to the \`type\` attribute:

    - shell: For running shell commands.

      - When Using \`npx\` or \`npm create\`, ALWAYS provide the \`--yes\` flag (to avoid prompting the user for input).
      - When running multiple shell commands, use \`&&\` to run them sequentially.
      - ULTRA IMPORTANT: Do NOT re-run a dev command if there is one that starts a dev server and only files updated! If a dev server has started already and no new shell actions will be executed, the dev server will stay alive.
      - Never use the shell action type for running dev servers or starting the project, for that always prefer the start action type instead.

    - start: For running shell commands that are intended to start the project.

      - Follow the guidelines for shell commands.
      - Use the start action type over the shell type ONLY when the command is intended to start the project.

    - file: For creating new files or updating existing files. Add \`filePath\` and \`contentType\` attributes:

      - \`filePath\`: Specifies the file path

      MANDATORY, you MUST follow these instructions when working with file actions:

        - Only include file actions for new or modified files
        - You must ALWAYS add a \`contentType\` attribute
        - NEVER use diffs for creating new files or SQL migrations files inside \`/home/project/supabase/migrations\`
        - FORBIDDEN: Binary files of any kind
        - FORBIDDEN: Base64-encoded assets (e.g., images, audio files, fonts)
        - For images and other binary assets:
          - MUST be either:
            - Referenced from existing project files
            - Loaded from external URLs
          - NEVER embed binary data directly in the files
          - NEVER include binary file formats (e.g., .jpg, .png, .gif, .woff)

    IMPORTANT: For SQL migration files, NEVER apply diffs. Instead, always create a new file with the complete content.

  10. The order of the actions is CRITICAL. Follow these guidelines:

    - Create all necessary files BEFORE running any shell commands that depend on them.
    - For each shell command, ensure all required files exist beforehand.
    - When using tools like shadcn/ui, create configuration files (e.g., \`tailwind.config.js\`) before running initialization commands.
    - For non-TypeScript projects, always create a \`jsconfig.json\` file to ensure compatibility with tools like shadcn/ui.

  11. Prioritize installing required dependencies by updating \`package.json\` first.

    - If a \`package.json\` exists, dependencies should be auto-installed IMMEDIATELY as the first action using the shell action to install dependencies.
    - If you need to update the \`package.json\` file make sure it's the FIRST action, so dependencies can install in parallel to the rest of the response being streamed.
    - \`npm install\` will not automatically run every time \`package.json\` is updated, so you need to include a shell action to install dependencies.
    - Only proceed with other actions after the required dependencies have been added to the \`package.json\`.

    IMPORTANT: Add all required dependencies to the \`package.json\` file upfront. Avoid using \`npm i <pkg>\` or similar commands to install individual packages. Instead, update the \`package.json\` file with all necessary dependencies and then run a single install command.

  12. When running a dev server NEVER say something like "You can now view X by opening the provided local server URL in your browser". The preview will be opened automatically or by the user manually!

  13. The start command should be the LAST action in the artifact, do not include this in the install command these should be seperate unless being run as the single last command.
</artifact_instructions>

<design_instructions>
  When creating designs or UIs for applications, follow these guidelines indefinitely this is non-negotiable:

  CRITICAL:
  - Always strive for professional, beautiful, and unique designs
  - All designs should be fully featured and worthy of production use
  - Never create designs with placeholder content unless explicitly requested
  - Inspired by Apple-level design polish
  - Subtle animations for scroll reveals and interactive elements
  - Subtle shadows and rounded corners for dimensional depth
  - Generous whitespace and clear visual hierarchy following 8px spacing system
  - Always create interactive and engaging designs that go beyond static visuals.
    - Each UI component must serve a functional purpose (e.g., a gallery should allow image zoom/expansion, a form should validate in real time).
    - Mimic user expectations — cards should be clickable if they represent a navigable entity, lists should be filterable/searchable, etc.
    - Prioritize micro-interactions (e.g., hover states, click animations, transitions) to give users responsive feedback.
    - Always question: “What will the user want to do with this element?”
  - DO NOT in any circumstances use Unsplash for stock photos, instead you should ALWAYS use Pexels

  AVOID GENERIC DESIGN:
  - Never use basic or default layout structures without adding custom visual polish
  - Header branding MUST NOT be simple “icon and text” combos — every header should reflect product branding with intentionality, motion, and sophistication
  - Navigation should be styled contextually with advanced interaction patterns (e.g., scroll-aware transitions, content-aware menus)
  - Ensure every screen has a visual signature — avoid layouts that could be mistaken for a free template
  - Elevate common UI patterns using motion, custom icons, branding accents, layered z-depth, or illustration
  - Add scroll effects, dynamic feedback, and hover micro-transitions to enhance visual interest
  - Always ask: “Would this design impress a senior product designer at Apple or Stripe?” If not, iterate until it would

  COLOR SCHEMES:
  - Sophisticated color palette with primary, accent, and complementary colors plus neutral tones
  - Use sufficient contrast for text/background combinations (minimum 4.5:1 ratio)
  - Limit color palette to 3-5 main colors plus neutrals
  - Consider color psychology appropriate to the application purpose

  TYPOGRAPHY:
  - Use readable font sizes (minimum 16px for body text on web)
  - Choose appropriate font pairings (often one serif + one sans-serif)
  - Establish a clear typographic hierarchy
  - Use consistent line heights and letter spacing
  - Default to system fonts or Google Fonts when no preference is stated

  LAYOUT:
  - Implement responsive designs for all screen sizes
  - Optimize for both mobile and desktop experiences
  - Follow visual hierarchy principles (size, color, contrast, repetition)
  - Ensure designs are accessible and follow WCAG guidelines
  - High-contrast text ensuring readability across all sections

  RESPONSIVE DESIGN:
  - Always create designs that work well across all device sizes
  - Use flexible grids, flexible images, and media queries
  - Test layouts at common breakpoints (mobile, tablet, desktop)
  - Consider touch targets on mobile (minimum 44x44px)
  - Ensure text remains readable at all screen sizes

  COMPONENTS:
  - Design reusable components with consistent styling
  - Create purpose-built components rather than generic ones
  - Include appropriate feedback states (hover, active, disabled)
  - Ensure accessible focus states for keyboard navigation
  - Consider animations and transitions for improved UX

  IMAGES AND ASSETS:
  - Use high-quality, relevant images that enhance the user experience
  - Optimize images for performance
  - Include appropriate alt text for accessibility
  - Maintain consistent styling across all visual elements
  - Use vector icons when possible for crisp display at all sizes

  ACCESSIBILITY:
  - Ensure sufficient color contrast
  - Include focus indicators for keyboard navigation
  - Add appropriate ARIA attributes where needed
  - Design with screen readers in mind
  - Structure content logically and hierarchically

  DARK MODE:
  - Implement dark mode when requested
  - Use appropriate contrast in both light and dark modes
  - Choose colors that work well in both modes
  - Consider reduced motion preferences

  FORMS:
  - Include clear labels for all form elements
  - Add helpful validation messages
  - Design clear error states
  - Make forms as simple as possible
  - Group related form elements logically

  UI PATTERNS:
  - Use established UI patterns that users will recognize
  - Create clear visual hierarchies to guide users
  - Design intuitive navigation systems
  - Use appropriate feedback mechanisms for user actions
  - Consider progressive disclosure for complex interfaces

  ADVANCED TECHNIQUES:
  - Consider micro-interactions to enhance the user experience
  - Use animations purposefully and sparingly
  - Incorporate skeletons/loading states for better perceived performance
  - Design for multiple user roles when applicable
  - Consider internationalization needs (text expansion, RTL support)

  RESPONSIVE FRAMEWORKS:
  - When using TailwindCSS, utilize its responsive prefixes (sm:, md:, lg:, etc.)
  - Use CSS Grid and Flexbox for layouts
  - Implement appropriate container queries when needed
  - Structure mobile-first designs that progressively enhance for larger screens
</design_instructions>

<mobile_app_instructions>
  The following instructions provide guidance on mobile app development, It is ABSOLUTELY CRITICAL you follow these guidelines.

  Think HOLISTICALLY and COMPREHENSIVELY BEFORE creating an artifact. This means:

    - Consider the contents of ALL files in the project
    - Review ALL existing files, previous file changes, and user modifications
    - Analyze the entire project context and dependencies
    - Anticipate potential impacts on other parts of the system

    This holistic approach is absolutely essential for creating coherent and effective solutions!

  IMPORTANT: React Native and Expo are the ONLY supported mobile frameworks in WebContainer.

  GENERAL GUIDELINES:

  1. Always use Expo (managed workflow) as the starting point for React Native projects
     - Use \`npx create-expo-app my-app\` to create a new project
     - When asked about templates, choose blank TypeScript

  2. File Structure:
     - Organize files by feature or route, not by type
     - Keep component files focused on a single responsibility
     - Use proper TypeScript typing throughout the project

  3. For navigation, use React Navigation:
     - Install with \`npm install @react-navigation/native\`
     - Install required dependencies: \`npm install @react-navigation/bottom-tabs @react-navigation/native-stack @react-navigation/drawer\`
     - Install required Expo modules: \`npx expo install react-native-screens react-native-safe-area-context\`

  4. For styling:
     - Use React Native's built-in styling

  5. For state management:
     - Use React's built-in useState and useContext for simple state
     - For complex state, prefer lightweight solutions like Zustand or Jotai

  6. For data fetching:
     - Use React Query (TanStack Query) or SWR
     - For GraphQL, use Apollo Client or urql

  7. Always provde feature/content rich screens:
      - Always include a index.tsx tab as the main tab screen
      - DO NOT create blank screens, each screen should be feature/content rich
      - All tabs and screens should be feature/content rich
      - Use domain-relevant fake content if needed (e.g., product names, avatars)
      - Populate all lists (5–10 items minimum)
      - Include all UI states (loading, empty, error, success)
      - Include all possible interactions (e.g., buttons, links, etc.)
      - Include all possible navigation states (e.g., back, forward, etc.)

  8. For photos:
       - Unless specified by the user, Bolt ALWAYS uses stock photos from Pexels where appropriate, only valid URLs you know exist. Bolt NEVER downloads the images and only links to them in image tags.

  EXPO CONFIGURATION:

  1. Define app configuration in app.json:
     - Set appropriate name, slug, and version
     - Configure icons and splash screens
     - Set orientation preferences
     - Define any required permissions

  2. For plugins and additional native capabilities:
     - Use Expo's config plugins system
     - Install required packages with \`npx expo install\`

  3. For accessing device features:
     - Use Expo modules (e.g., \`expo-camera\`, \`expo-location\`)
     - Install with \`npx expo install\` not npm/yarn

  UI COMPONENTS:

  1. Prefer built-in React Native components for core UI elements:
     - View, Text, TextInput, ScrollView, FlatList, etc.
     - Image for displaying images
     - TouchableOpacity or Pressable for press interactions

  2. For advanced components, use libraries compatible with Expo:
     - React Native Paper
     - Native Base
     - React Native Elements

  3. Icons:
     - Use \`lucide-react-native\` for various icon sets

  PERFORMANCE CONSIDERATIONS:

  1. Use memo and useCallback for expensive components/functions
  2. Implement virtualized lists (FlatList, SectionList) for large data sets
  3. Use appropriate image sizes and formats
  4. Implement proper list item key patterns
  5. Minimize JS thread blocking operations

  ACCESSIBILITY:

  1. Use appropriate accessibility props:
     - accessibilityLabel
     - accessibilityHint
     - accessibilityRole
  2. Ensure touch targets are at least 44×44 points
  3. Test with screen readers (VoiceOver on iOS, TalkBack on Android)
  4. Support Dark Mode with appropriate color schemes
  5. Implement reduced motion alternatives for animations

  DESIGN PATTERNS:

  1. Follow platform-specific design guidelines:
     - iOS: Human Interface Guidelines
     - Android: Material Design

  2. Component structure:
     - Create reusable components
     - Implement proper prop validation with TypeScript
     - Use React Native's built-in Platform API for platform-specific code

  3. For form handling:
     - Use Formik or React Hook Form
     - Implement proper validation (Yup, Zod)

  4. Design inspiration:
     - Visually stunning, content-rich, professional-grade UIs
     - Inspired by Apple-level design polish
     - Every screen must feel “alive” with real-world UX patterns
     

  EXAMPLE STRUCTURE:

  \`\`\`
  app/                        # App screens
  ├── (tabs)/
  │    ├── index.tsx          # Root tab IMPORTANT
  │    └── _layout.tsx        # Root tab layout
  ├── _layout.tsx             # Root layout
  ├── assets/                 # Static assets
  ├── components/             # Shared components
  ├── hooks/  
      └── useFrameworkReady.ts
  ├── constants/              # App constants
  ├── app.json                # Expo config
  ├── expo-env.d.ts           # Expo environment types
  ├── tsconfig.json           # TypeScript config
  └── package.json            # Package dependencies
  \`\`\`

  TROUBLESHOOTING:

  1. For Metro bundler issues:
     - Clear cache with \`npx expo start -c\`
     - Check for dependency conflicts
     - Verify Node.js version compatibility

  2. For TypeScript errors:
     - Ensure proper typing
     - Update tsconfig.json as needed
     - Use type assertions sparingly

  3. For native module issues:
     - Verify Expo compatibility
     - Use Expo's prebuild feature for custom native code
     - Consider upgrading to Expo's dev client for testing
</mobile_app_instructions>

<examples>
  <example>
    <user_query>Start with a basic vanilla Vite template and do nothing. I will tell you in my next message what to do.</user_query>

    <assistant_response>Understood. The basic Vanilla Vite template is already set up in the project. I'll ensure the development server is running so you can see the default Vite starter page.

<boltArtifact id="start-dev-server" title="Start Vite development server">
<boltAction type="start">
npm run dev
</boltAction>
</boltArtifact>

The development server is now running. The project is ready for your next instructions.</assistant_response>
  </example>

  <example>
    <user_query>How do I center a div?</user_query>

    <assistant_response>To center a div, we'll use CSS flexbox or grid, which are the modern approaches for centering elements both horizontally and vertically. I'll update the App component to demonstrate these techniques.

<boltArtifact id="centered-div" title="Centering a div using CSS flexbox">
<boltAction type="file" filePath="src/App.tsx" contentType="content">import React from 'react';
import './App.css';

function App() {
  return (
    <div className="container">
      <h1>Centering Methods in CSS</h1>
      
      <h2>1. Using Flexbox (Most Common)</h2>
      <div className="center-example flexbox-center">
        <div className="box">Centered with Flexbox</div>
      </div>
      
      <h2>2. Using Grid</h2>
      <div className="center-example grid-center">
        <div className="box">Centered with Grid</div>
      </div>
      
      <h2>3. Using Position Absolute</h2>
      <div className="center-example position-center">
        <div className="box">Centered with Position</div>
      </div>
    </div>
  );
}

export default App;</boltAction>
<boltAction type="file" filePath="src/App.css" contentType="content">.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.center-example {
  margin: 20px 0;
  border: 1px dashed #ccc;
  height: 200px;
  position: relative;
}

.box {
  background-color: #3498db;
  color: white;
  padding: 20px;
  border-radius: 4px;
  width: 200px;
  text-align: center;
}

/* 1. Flexbox Method */
.flexbox-center {
  display: flex;
  justify-content: center; /* Horizontal centering */
  align-items: center;     /* Vertical centering */
}

/* 2. Grid Method */
.grid-center {
  display: grid;
  place-items: center;  /* Shorthand for align-items and justify-items */
}

/* 3. Position Absolute Method */
.position-center {
  /* The parent needs position: relative (set in .center-example) */
}

.position-center .box {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}</boltAction>
<boltAction type="start">
npm run dev
</boltAction>
</boltArtifact>

I've created a demonstration of three different ways to center a div:

1. **Using Flexbox** - This is the most recommended modern approach:
   - Set the parent container to \`display: flex\`
   - Use \`justify-content: center\` for horizontal centering
   - Use \`align-items: center\` for vertical centering

2. **Using CSS Grid** - Even simpler than flexbox in some cases:
   - Set the parent container to \`display: grid\`
   - Use \`place-items: center\` to center in both directions at once

3. **Using Position Absolute** - The traditional method:
   - Set the parent to \`position: relative\`
   - Set the child to \`position: absolute\`
   - Use \`top: 50%; left: 50%\` to position at the center
   - Use \`transform: translate(-50%, -50%)\` to adjust for the element's size

The flexbox method is generally the most versatile and recommended approach for most centering needs in modern web development.</assistant_response>
  </example>
</examples>`;
stripIndents`
  Continue your prior response. IMPORTANT: Immediately begin from where you left off without any interruptions.
  Do not repeat any content, including artifact and action tags.
`;

class PromptLibrary {
  static library = {
    default: {
      label: "Default Prompt",
      description: "This is the battle tested default system Prompt",
      get: (options) => getSystemPrompt(
        options.cwd,
        options.supabase,
        options.userMessages,
        options.customSkills,
        options.llmSelectedSkills,
        options.disabledSkills
      )
    },
    enhanced: {
      label: "Fine Tuned Prompt",
      description: "An fine tuned prompt for better results",
      get: (options) => getFineTunedPrompt(options.cwd, options.supabase)
    },
    optimized: {
      label: "Optimized Prompt (experimental)",
      description: "an Experimental version of the prompt for lower token usage",
      get: (options) => optimized(options)
    }
  };
  static getList() {
    return Object.entries(this.library).map(([key, value]) => {
      const { label, description } = value;
      return {
        id: key,
        label,
        description
      };
    });
  }
  static getPropmtFromLibrary(promptId, options) {
    const prompt = this.library[promptId];
    if (!prompt) {
      throw "Prompt Now Found";
    }
    return this.library[promptId]?.get(options);
  }
}

function extractPropertiesFromMessage(message) {
  const textContent = Array.isArray(message.content) ? message.content.find((item) => item.type === "text")?.text || "" : message.content;
  const modelMatch = textContent.match(MODEL_REGEX);
  const providerMatch = textContent.match(PROVIDER_REGEX);
  const model = modelMatch ? modelMatch[1] : DEFAULT_MODEL;
  const provider = providerMatch ? providerMatch[1] : DEFAULT_PROVIDER.name;
  const cleanedContent = Array.isArray(message.content) ? message.content.map((item) => {
    if (item.type === "text") {
      return {
        type: "text",
        text: item.text?.replace(MODEL_REGEX, "").replace(PROVIDER_REGEX, "")
      };
    }
    return item;
  }) : textContent.replace(MODEL_REGEX, "").replace(PROVIDER_REGEX, "");
  return { model, provider, content: cleanedContent };
}
function simplifyBoltActions(input) {
  const regex = /(<boltAction[^>]*type="file"[^>]*>)([\s\S]*?)(<\/boltAction>)/g;
  return input.replace(regex, (_0, openingTag, _2, closingTag) => {
    return `${openingTag}
          ...
        ${closingTag}`;
  });
}
function createFilesContext(files, useRelativePath) {
  const ig = ignore().add(IGNORE_PATTERNS$2);
  let filePaths = Object.keys(files);
  filePaths = filePaths.filter((x) => {
    const relPath = x.replace("/home/project/", "");
    return !ig.ignores(relPath);
  });
  const fileContexts = filePaths.filter((x) => files[x] && files[x].type == "file").map((path) => {
    const dirent = files[path];
    if (!dirent || dirent.type == "folder") {
      return "";
    }
    const codeWithLinesNumbers = dirent.content.split("\n").join("\n");
    let filePath = path;
    if (useRelativePath) {
      filePath = path.replace("/home/project/", "");
    }
    return `<boltAction type="file" filePath="${filePath}">${codeWithLinesNumbers}</boltAction>`;
  });
  return `<boltArtifact id="code-content" title="Code Content" >
${fileContexts.join("\n")}
</boltArtifact>`;
}
function extractCurrentContext(messages) {
  const lastAssistantMessage = messages.filter((x) => x.role == "assistant").slice(-1)[0];
  if (!lastAssistantMessage) {
    return { summary: void 0, codeContext: void 0 };
  }
  let summary;
  let codeContext;
  if (!lastAssistantMessage.annotations?.length) {
    return { summary: void 0, codeContext: void 0 };
  }
  for (let i = 0; i < lastAssistantMessage.annotations.length; i++) {
    const annotation = lastAssistantMessage.annotations[i];
    if (!annotation || typeof annotation !== "object") {
      continue;
    }
    if (!annotation.type) {
      continue;
    }
    const annotationObject = annotation;
    if (annotationObject.type === "codeContext") {
      codeContext = annotationObject;
      break;
    } else if (annotationObject.type === "chatSummary") {
      summary = annotationObject;
      break;
    }
  }
  return { summary, codeContext };
}

if (typeof navigator === "undefined" || navigator.userAgent !== "Cloudflare-Workers") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {
  }
}
const MONGODB_URI$3 = process.env.MONGODB_URI || "mongodb+srv://the-usman:Usm123000@cluster0.gqzyjmn.mongodb.net/";
const DB_NAME$2 = "project_db_client";
const COLLECTION$2 = "custom_skills";
const MAX_BODY_CHARS = 32e3;
async function getCollection$1() {
  const client = new MongoClient(MONGODB_URI$3);
  await client.connect();
  return { collection: client.db(DB_NAME$2).collection(COLLECTION$2), client };
}
function parseSkillMd(raw, fallbackName) {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  let name = "";
  let description = "";
  let triggers;
  let body = text;
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fmMatch) {
    body = text.slice(fmMatch[0].length);
    for (const line of fmMatch[1].split("\n")) {
      const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
      if (!kv) {
        continue;
      }
      const key = kv[1].toLowerCase();
      const value = kv[2].trim().replace(/^['"]|['"]$/g, "");
      if (key === "name") {
        name = value;
      } else if (key === "description") {
        description = value;
      } else if (key === "triggers") {
        triggers = value || void 0;
      }
    }
  }
  if (!name) {
    const heading = body.match(/^#\s+(.+)$/m);
    name = heading?.[1] || fallbackName || "";
  }
  name = name.toLowerCase().trim().replace(/\.md$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  if (!name) {
    throw new Error("Skill has no name — add a `name:` field in the SKILL.md frontmatter.");
  }
  if (!description) {
    description = body.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("#")) || name;
  }
  body = body.trim();
  if (!body) {
    throw new Error("Skill body is empty.");
  }
  if (body.length > MAX_BODY_CHARS) {
    throw new Error(`Skill body is too large (${body.length} chars, max ${MAX_BODY_CHARS}).`);
  }
  return { name, description: description.slice(0, 500), triggers, body };
}
async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "sitara-skill-importer" } });
  if (!response.ok) {
    return null;
  }
  return await response.text();
}
async function importSkillFromGit(url) {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (/\.md(\?.*)?$/i.test(trimmed)) {
    const rawUrl = trimmed.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/").replace("/raw/", "/");
    const md2 = await fetchText(rawUrl);
    if (!md2) {
      throw new Error(`Could not fetch markdown from ${rawUrl}`);
    }
    return parseSkillMd(md2, trimmed.split("/").pop());
  }
  const gh = trimmed.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)(?:\/(.*))?)?$/);
  if (gh) {
    const [, owner, repo, branch, subPath] = gh;
    const branches = branch ? [branch] : ["HEAD", "main", "master"];
    const dir = subPath ? `${subPath}/` : "";
    for (const b of branches) {
      for (const file of ["SKILL.md", "skill.md", "README.md"]) {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${dir}${file}`;
        const md2 = await fetchText(rawUrl);
        if (md2) {
          return parseSkillMd(md2, repo);
        }
      }
    }
    throw new Error("No SKILL.md (or README.md) found in that repository. Point the URL at the skill folder.");
  }
  const md = await fetchText(trimmed);
  if (md && !md.trim().startsWith("<")) {
    return parseSkillMd(md, trimmed.split("/").pop());
  }
  throw new Error("Unsupported URL. Use a GitHub repo/folder URL or a direct link to a .md file.");
}
async function importSkillFromZip(base64, filename) {
  const zip = await JSZip.loadAsync(Buffer.from(base64, "base64"));
  const candidates = Object.keys(zip.files).filter((p) => /(^|\/)skill\.md$/i.test(p) && !zip.files[p].dir);
  candidates.sort((a, b) => a.split("/").length - b.split("/").length);
  const entry = candidates[0];
  if (!entry) {
    throw new Error("No SKILL.md found inside the zip.");
  }
  const md = await zip.files[entry].async("string");
  return parseSkillMd(md, filename?.replace(/\.zip$/i, ""));
}
async function saveCustomSkill(parsed, source, createdBy, options) {
  const { collection, client } = await getCollection$1();
  try {
    const now = /* @__PURE__ */ new Date();
    const triggers = options?.triggers?.trim() || parsed.triggers;
    if (triggers) {
      new RegExp(triggers, "i");
    }
    const doc = {
      name: parsed.name,
      description: parsed.description,
      body: parsed.body,
      ...triggers ? { triggers } : {},
      alwaysLoad: !!options?.alwaysLoad,
      enabled: true,
      source,
      createdBy,
      updatedAt: now
    };
    await collection.updateOne(
      { name: parsed.name },
      { $set: doc, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    invalidateSkillsCache();
    return await collection.findOne({ name: parsed.name });
  } finally {
    await client.close();
  }
}
async function listCustomSkills() {
  const { collection, client } = await getCollection$1();
  try {
    const docs = await collection.find({}).sort({ name: 1 }).toArray();
    return docs.map(({ body, ...rest }) => ({ ...rest, bodyChars: body.length }));
  } finally {
    await client.close();
  }
}
async function setCustomSkillEnabled(name, enabled) {
  const { collection, client } = await getCollection$1();
  try {
    await collection.updateOne({ name }, { $set: { enabled, updatedAt: /* @__PURE__ */ new Date() } });
    invalidateSkillsCache();
  } finally {
    await client.close();
  }
}
async function deleteCustomSkill(name) {
  const { collection, client } = await getCollection$1();
  try {
    await collection.deleteOne({ name });
    invalidateSkillsCache();
  } finally {
    await client.close();
  }
}
let skillsCache = null;
let disabledBuiltinsCache = null;
const CACHE_TTL_MS$1 = 6e4;
function invalidateSkillsCache() {
  skillsCache = null;
  disabledBuiltinsCache = null;
}
const SETTINGS_COLLECTION = "skill_settings";
const BUILTIN_SETTINGS_ID = "builtin_disabled";
async function getDisabledBuiltinSkillNames() {
  if (disabledBuiltinsCache && Date.now() - disabledBuiltinsCache.loadedAt < CACHE_TTL_MS$1) {
    return disabledBuiltinsCache.names;
  }
  const client = new MongoClient(MONGODB_URI$3);
  try {
    await client.connect();
    const doc = await client.db(DB_NAME$2).collection(SETTINGS_COLLECTION).findOne({ _id: BUILTIN_SETTINGS_ID });
    const names = Array.isArray(doc?.names) ? doc.names : [];
    disabledBuiltinsCache = { names, loadedAt: Date.now() };
    return names;
  } finally {
    await client.close();
  }
}
async function setBuiltinSkillEnabled(name, enabled) {
  const client = new MongoClient(MONGODB_URI$3);
  try {
    await client.connect();
    await client.db(DB_NAME$2).collection(SETTINGS_COLLECTION).updateOne(
      { _id: BUILTIN_SETTINGS_ID },
      enabled ? { $pull: { names: name } } : { $addToSet: { names: name } },
      { upsert: true }
    );
    invalidateSkillsCache();
  } finally {
    await client.close();
  }
}
function triggersFromName(name) {
  const words = name.split("-").filter((w) => w.length > 3);
  const parts = [name, name.replace(/-/g, " "), ...words];
  return new RegExp(`\\b(${parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
}
function toPromptSkill(doc) {
  const tagName = doc.name.replace(/-/g, "_");
  return {
    name: doc.name,
    description: doc.description,
    triggers: doc.triggers ? new RegExp(doc.triggers, "i") : triggersFromName(doc.name),
    ...doc.alwaysLoad ? { alwaysLoad: true } : {},
    body: () => `<${tagName}_skill>
${doc.body}
</${tagName}_skill>`
  };
}
async function getActiveCustomPromptSkills() {
  if (skillsCache && Date.now() - skillsCache.loadedAt < CACHE_TTL_MS$1) {
    return skillsCache.skills;
  }
  const { collection, client } = await getCollection$1();
  try {
    const docs = await collection.find({ enabled: true }).toArray();
    const skills = docs.map(toPromptSkill);
    skillsCache = { skills, loadedAt: Date.now() };
    return skills;
  } finally {
    await client.close();
  }
}

const logger$d = createScopedLogger("select-skills");
const MAX_MESSAGE_CHARS = 600;
async function selectSkillsViaLLM(props) {
  const { model, userMessages, catalog } = props;
  if (catalog.length === 0) {
    return [];
  }
  const recent = userMessages.slice(-4).map((m) => `- ${m.length > MAX_MESSAGE_CHARS ? `${m.slice(0, MAX_MESSAGE_CHARS)}…` : m}`).join("\n");
  const catalogText = catalog.map((s) => `- ${s.name}: ${s.description}`).join("\n");
  try {
    const result = await generateText({
      model,
      maxTokens: 120,
      temperature: 0,
      system: 'You route which specialized instruction modules ("skills") an AI website builder needs to answer the next user request. Reply ONLY with a JSON array of skill names, e.g. ["ui-ux-design","threejs-3d"]. Select every skill that is relevant to what the user wants next (be generous with directly relevant ones), and none that are not. An empty array [] is a valid answer for trivial requests like fixing a typo.',
      prompt: `Available skills:
${catalogText}

Recent user messages (latest last):
${recent}

Which skills should be loaded?`
    });
    const match = result.text.match(/\[[\s\S]*?\]/);
    if (!match) {
      logger$d.warn(`Skill router returned no JSON array: ${result.text.slice(0, 200)}`);
      return void 0;
    }
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) {
      return void 0;
    }
    const validNames = new Set(catalog.map((s) => s.name));
    const selected = parsed.filter((n) => typeof n === "string" && validNames.has(n));
    logger$d.info(`Skill router selected: [${selected.join(", ")}] (${result.usage?.totalTokens ?? "?"} router tokens)`);
    return selected;
  } catch (error) {
    logger$d.error("Skill router failed, falling back to trigger matching", error);
    return void 0;
  }
}

const logger$c = createScopedLogger("stream-text");
async function streamText(props) {
  const {
    messages,
    env: serverEnv,
    options,
    apiKeys,
    files,
    providerSettings,
    promptId,
    contextOptimization,
    contextFiles,
    summary
  } = props;
  let currentModel = DEFAULT_MODEL;
  let currentProvider = DEFAULT_PROVIDER.name;
  let processedMessages = messages.map((message) => {
    if (message.role === "user") {
      const { model, provider: provider2, content } = extractPropertiesFromMessage(message);
      currentModel = model;
      currentProvider = provider2;
      return { ...message, content };
    } else if (message.role == "assistant") {
      let content = message.content;
      content = content.replace(/<div class=\\"__boltThought__\\">.*?<\/div>/s, "");
      content = content.replace(/<think>.*?<\/think>/s, "");
      content = content.replace(
        /<boltAction type="file" filePath="package-lock\.json">[\s\S]*?<\/boltAction>/g,
        "[package-lock.json content removed]"
      );
      content = content.trim();
      return { ...message, content };
    }
    return message;
  });
  const provider = PROVIDER_LIST.find((p) => p.name === currentProvider) || DEFAULT_PROVIDER;
  const staticModels = LLMManager.getInstance().getStaticModelListFromProvider(provider);
  let modelDetails = staticModels.find((m) => m.name === currentModel);
  if (!modelDetails) {
    const modelsList = [
      ...provider.staticModels || [],
      ...await LLMManager.getInstance().getModelListFromProvider(provider, {
        apiKeys,
        providerSettings,
        serverEnv
      })
    ];
    if (!modelsList.length) {
      throw new Error(`No models found for provider ${provider.name}`);
    }
    modelDetails = modelsList.find((m) => m.name === currentModel);
    if (!modelDetails) {
      logger$c.warn(
        `MODEL [${currentModel}] not found in provider [${provider.name}]. Falling back to first model. ${modelsList[0].name}`
      );
      modelDetails = modelsList[0];
    }
  }
  const dynamicMaxTokens = modelDetails && modelDetails.maxTokenAllowed ? modelDetails.maxTokenAllowed : MAX_TOKENS;
  let customSkills = [];
  let disabledSkills = [];
  try {
    [customSkills, disabledSkills] = await Promise.all([getActiveCustomPromptSkills(), getDisabledBuiltinSkillNames()]);
  } catch (error) {
    logger$c.error("Failed to load skill configuration", error);
  }
  const userMessageTexts = processedMessages.filter((message) => message.role === "user").map(
    (message) => typeof message.content === "string" ? message.content : message.content.filter((part) => part?.type === "text").map((part) => part.text).join("\n")
  );
  const modelInstance = provider.getModelInstance({
    model: modelDetails.name,
    serverEnv,
    apiKeys,
    providerSettings
  });
  const skillContext = {
    cwd: WORK_DIR,
    supabase: {
      isConnected: options?.supabaseConnection?.isConnected || false,
      hasSelectedProject: options?.supabaseConnection?.hasSelectedProject || false,
      credentials: options?.supabaseConnection?.credentials || void 0
    }
  };
  const llmSelectedSkills = await selectSkillsViaLLM({
    model: modelInstance,
    userMessages: userMessageTexts,
    catalog: [...promptSkills, ...customSkills].filter((s) => !disabledSkills.includes(s.name)).map((s) => ({
      name: s.name,
      description: s.name === "database-supabase" && skillContext.supabase.isConnected ? `${s.description} NOTE: Supabase IS connected in this chat — select this whenever the request involves data, accounts, auth, or persistence.` : s.description
    }))
  });
  const loadedSkillNames = selectSkills(
    userMessageTexts,
    skillContext,
    customSkills,
    llmSelectedSkills,
    disabledSkills
  ).map((s) => s.name);
  logger$c.info(`Skills loaded: [${loadedSkillNames.join(", ")}]`);
  props.onSkillsLoaded?.(loadedSkillNames);
  let systemPrompt = PromptLibrary.getPropmtFromLibrary(promptId || "default", {
    cwd: WORK_DIR,
    allowedHtmlElements: allowedHTMLElements,
    modificationTagName: MODIFICATIONS_TAG_NAME,
    userMessages: userMessageTexts,
    customSkills,
    llmSelectedSkills,
    disabledSkills,
    supabase: {
      isConnected: options?.supabaseConnection?.isConnected || false,
      hasSelectedProject: options?.supabaseConnection?.hasSelectedProject || false,
      credentials: options?.supabaseConnection?.credentials || void 0
    }
  }) ?? getSystemPrompt();
  if (contextFiles && contextOptimization) {
    const codeContext = createFilesContext(contextFiles, true);
    systemPrompt = `${systemPrompt}

Below is the artifact containing the context loaded into context buffer for you to have knowledge of and might need changes to fullfill current user request.
CONTEXT BUFFER:
---
${codeContext}
---
`;
    if (summary) {
      systemPrompt = `${systemPrompt}
      below is the chat history till now
CHAT SUMMARY:
---
${props.summary}
---
`;
      if (props.messageSliceId) {
        processedMessages = processedMessages.slice(props.messageSliceId);
      } else {
        const lastMessage = processedMessages.pop();
        if (lastMessage) {
          processedMessages = [lastMessage];
        }
      }
    }
  }
  const effectiveLockedFilePaths = /* @__PURE__ */ new Set();
  if (files) {
    for (const [filePath, fileDetails] of Object.entries(files)) {
      if (fileDetails?.isLocked) {
        effectiveLockedFilePaths.add(filePath);
      }
    }
  }
  if (effectiveLockedFilePaths.size > 0) {
    const lockedFilesListString = Array.from(effectiveLockedFilePaths).map((filePath) => `- ${filePath}`).join("\n");
    systemPrompt = `${systemPrompt}

IMPORTANT: The following files are locked and MUST NOT be modified in any way. Do not suggest or make any changes to these files. You can proceed with the request but DO NOT make any changes to these files specifically:
${lockedFilesListString}
---
`;
  } else {
    console.log("No locked files found from any source for prompt.");
  }
  logger$c.info(`Sending llm call to ${provider.name} with model ${modelDetails.name}`);
  logger$c.info(`System prompt: ${systemPrompt.length} chars (~${Math.round(systemPrompt.length / 4)} tokens)`);
  return await streamText$1({
    model: modelInstance,
    system: systemPrompt,
    maxTokens: dynamicMaxTokens,
    messages: convertToCoreMessages(processedMessages),
    ...options
  });
}

function parseCookies$1(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) {
    return cookies;
  }
  const items = cookieHeader.split(";").map((cookie) => cookie.trim());
  items.forEach((item) => {
    const [name, ...rest] = item.split("=");
    if (name && rest.length > 0) {
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(rest.join("=").trim());
      cookies[decodedName] = decodedValue;
    }
  });
  return cookies;
}
function getApiKeysFromCookie(cookieHeader) {
  const cookies = parseCookies$1(cookieHeader);
  return cookies.apiKeys ? JSON.parse(cookies.apiKeys) : {};
}
function getProviderSettingsFromCookie(cookieHeader) {
  const cookies = parseCookies$1(cookieHeader);
  return cookies.providers ? JSON.parse(cookies.providers) : {};
}

const VALID_SIZES = ["1024x1024", "1792x1024", "1024x1792"];
async function action$m({ context, request }) {
  const { messages, model, provider } = await request.json();
  const cookieHeader = request.headers.get("Cookie");
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);
  const chatText = messages.filter((m) => m.role === "user").map((m) => {
    const content = Array.isArray(m.content) ? m.content.find((c) => c.type === "text")?.text ?? "" : m.content;
    return content.replace(/^\[Model:.*?\]\n\n\[Provider:.*?\]\n\n/s, "").trim();
  }).filter(Boolean).slice(0, 6).join("\n---\n");
  try {
    const result = await streamText({
      messages: [
        {
          role: "user",
          content: `[Model: ${model}]

[Provider: ${provider.name}]

Based on this website-building conversation, generate the perfect professional image for this website. Output ONLY valid JSON with exactly these two keys:
- "prompt": a highly detailed, cinematic image generation prompt (50-80 words). Be specific about lighting, style, mood, colors, composition. Make it suitable for a professional website.
- "size": one of ["1792x1024", "1024x1024", "1024x1792"] — use "1792x1024" for hero banners/wide shots, "1024x1792" for portrait/product shots, "1024x1024" for icons/logos/square images

Conversation:
${chatText}

Reply with ONLY valid JSON, no extra text. Example: {"prompt":"A cinematic wide-angle shot of...","size":"1792x1024"}`
        }
      ],
      env: context.cloudflare?.env,
      apiKeys,
      providerSettings
    });
    const raw = (await result.text).trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const prompt = String(parsed.prompt || "").trim();
    const size = VALID_SIZES.includes(parsed.size) ? parsed.size : "1792x1024";
    return new Response(JSON.stringify({ prompt, size }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (_e) {
    return new Response(JSON.stringify({ prompt: "", size: "1792x1024" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

const route1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$m
}, Symbol.toStringTag, { value: 'Module' }));

const loader$q = async ({ request }) => {
  const url = new URL(request.url);
  const editorOrigin = url.searchParams.get("editorOrigin") || "https://stackblitz.com";
  console.log("editorOrigin", editorOrigin);
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Connect to WebContainer</title>
      </head>
      <body>
        <script type="module">
          (async () => {
            const { setupConnect } = await import('https://cdn.jsdelivr.net/npm/@webcontainer/api@latest/dist/connect.js');
            setupConnect({
              editorOrigin: '${editorOrigin}'
            });
          })();
        <\/script>
      </body>
    </html>
  `;
  return new Response(htmlContent, {
    headers: { "Content-Type": "text/html" }
  });
};

const route2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$q
}, Symbol.toStringTag, { value: 'Module' }));

const PREVIEW_CHANNEL$1 = "preview-updates";
async function loader$p({ params }) {
  const previewId = params.id;
  if (!previewId) {
    throw new Response("Preview ID is required", { status: 400 });
  }
  return json({ previewId });
}
function WebContainerPreview() {
  const { previewId } = useLoaderData();
  const iframeRef = useRef(null);
  const broadcastChannelRef = useRef();
  const [previewUrl, setPreviewUrl] = useState("");
  const handleRefresh = useCallback(() => {
    if (iframeRef.current && previewUrl) {
      iframeRef.current.src = "";
      requestAnimationFrame(() => {
        if (iframeRef.current) {
          iframeRef.current.src = previewUrl;
        }
      });
    }
  }, [previewUrl]);
  const notifyPreviewReady = useCallback(() => {
    if (broadcastChannelRef.current && previewUrl) {
      broadcastChannelRef.current.postMessage({
        type: "preview-ready",
        previewId,
        url: previewUrl,
        timestamp: Date.now()
      });
    }
  }, [previewId, previewUrl]);
  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel(PREVIEW_CHANNEL$1);
    broadcastChannelRef.current.onmessage = (event) => {
      if (event.data.previewId === previewId) {
        if (event.data.type === "refresh-preview" || event.data.type === "file-change") {
          handleRefresh();
        }
      }
    };
    const url = `https://${previewId}.local-credentialless.webcontainer-api.io`;
    setPreviewUrl(url);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
    notifyPreviewReady();
    return () => {
      broadcastChannelRef.current?.close();
    };
  }, [previewId, handleRefresh, notifyPreviewReady]);
  return /* @__PURE__ */ jsx("div", { className: "w-full h-full", children: /* @__PURE__ */ jsx(
    "iframe",
    {
      ref: iframeRef,
      title: "WebContainer Preview",
      className: "w-full h-full border-none",
      sandbox: "allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin",
      allow: "cross-origin-isolated",
      loading: "eager",
      onLoad: notifyPreviewReady
    }
  ) });
}

const route3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: WebContainerPreview,
  loader: loader$p
}, Symbol.toStringTag, { value: 'Module' }));

let execSync$2;
try {
  if (typeof process !== "undefined" && process.platform) {
    const childProcess = { execSync: null };
    execSync$2 = childProcess.execSync;
  }
} catch {
  console.log("Running in Cloudflare environment, child_process not available");
}
const isDevelopment$1 = false;
const getProcessInfo = () => {
  try {
    if (!execSync$2 && !isDevelopment$1) {
      return [
        {
          pid: 0,
          name: "N/A",
          cpu: 0,
          memory: 0,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          error: "Process information is not available in this environment"
        }
      ];
    }
    if (!execSync$2 && isDevelopment$1) ;
    const platform = process.platform;
    let processes = [];
    let cpuCount = 1;
    try {
      if (platform === "darwin") {
        const cpuInfo = execSync$2("sysctl -n hw.ncpu", { encoding: "utf-8" }).toString().trim();
        cpuCount = parseInt(cpuInfo, 10) || 1;
      } else if (platform === "linux") {
        const cpuInfo = execSync$2("nproc", { encoding: "utf-8" }).toString().trim();
        cpuCount = parseInt(cpuInfo, 10) || 1;
      } else if (platform === "win32") {
        const cpuInfo = execSync$2("wmic cpu get NumberOfCores", { encoding: "utf-8" }).toString().trim();
        const match = cpuInfo.match(/\d+/);
        cpuCount = match ? parseInt(match[0], 10) : 1;
      }
    } catch (error) {
      console.error("Failed to get CPU count:", error);
      cpuCount = 1;
    }
    if (platform === "darwin") {
      try {
        const output = execSync$2("ps -eo pid,pcpu,pmem,comm -r | head -n 11", { encoding: "utf-8" }).toString().trim();
        const lines = output.split("\n").slice(1);
        processes = lines.map((line) => {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[0], 10);
          const cpu = parseFloat(parts[1]) / cpuCount;
          const memory = parseFloat(parts[2]);
          const command = parts.slice(3).join(" ");
          return {
            pid,
            name: command.split("/").pop() || command,
            cpu,
            memory,
            command,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        });
      } catch (error) {
        console.error("Failed to get macOS process info:", error);
        try {
          const output = execSync$2("top -l 1 -stats pid,cpu,mem,command -n 10", { encoding: "utf-8" }).toString().trim();
          const lines = output.split("\n").slice(6);
          processes = lines.map((line) => {
            const parts = line.trim().split(/\s+/);
            const pid = parseInt(parts[0], 10);
            const cpu = parseFloat(parts[1]);
            const memory = parseFloat(parts[2]);
            const command = parts.slice(3).join(" ");
            return {
              pid,
              name: command.split("/").pop() || command,
              cpu,
              memory,
              command,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            };
          });
        } catch (fallbackError) {
          console.error("Failed to get macOS process info with fallback:", fallbackError);
          return [
            {
              pid: 0,
              name: "N/A",
              cpu: 0,
              memory: 0,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              error: "Process information is not available in this environment"
            }
          ];
        }
      }
    } else if (platform === "linux") {
      try {
        const output = execSync$2("ps -eo pid,pcpu,pmem,comm --sort=-pmem | head -n 11", { encoding: "utf-8" }).toString().trim();
        const lines = output.split("\n").slice(1);
        processes = lines.map((line) => {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[0], 10);
          const cpu = parseFloat(parts[1]) / cpuCount;
          const memory = parseFloat(parts[2]);
          const command = parts.slice(3).join(" ");
          return {
            pid,
            name: command.split("/").pop() || command,
            cpu,
            memory,
            command,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        });
      } catch (error) {
        console.error("Failed to get Linux process info:", error);
        try {
          const output = execSync$2("top -b -n 1 | head -n 17", { encoding: "utf-8" }).toString().trim();
          const lines = output.split("\n").slice(7);
          processes = lines.map((line) => {
            const parts = line.trim().split(/\s+/);
            const pid = parseInt(parts[0], 10);
            const cpu = parseFloat(parts[8]);
            const memory = parseFloat(parts[9]);
            const command = parts[11] || parts[parts.length - 1];
            return {
              pid,
              name: command.split("/").pop() || command,
              cpu,
              memory,
              command,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            };
          });
        } catch (fallbackError) {
          console.error("Failed to get Linux process info with fallback:", fallbackError);
          return [
            {
              pid: 0,
              name: "N/A",
              cpu: 0,
              memory: 0,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              error: "Process information is not available in this environment"
            }
          ];
        }
      }
    } else if (platform === "win32") {
      try {
        const output = execSync$2(
          `powershell "Get-Process | Sort-Object -Property WorkingSet64 -Descending | Select-Object -First 10 Id, CPU, @{Name='Memory';Expression={$_.WorkingSet64/1MB}}, ProcessName | ConvertTo-Json"`,
          { encoding: "utf-8" }
        ).toString().trim();
        const processData = JSON.parse(output);
        const processArray = Array.isArray(processData) ? processData : [processData];
        processes = processArray.map((proc) => ({
          pid: proc.Id,
          name: proc.ProcessName,
          // Normalize CPU percentage by dividing by CPU count
          cpu: (proc.CPU || 0) / cpuCount,
          memory: proc.Memory,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }));
      } catch (error) {
        console.error("Failed to get Windows process info:", error);
        try {
          const output = execSync$2("tasklist /FO CSV", { encoding: "utf-8" }).toString().trim();
          const lines = output.split("\n").slice(1);
          processes = lines.slice(0, 10).map((line) => {
            const parts = line.split(",").map((part) => part.replace(/^"(.+)"$/, "$1"));
            const pid = parseInt(parts[1], 10);
            const memoryStr = parts[4].replace(/[^\d]/g, "");
            const memory = parseInt(memoryStr, 10) / 1024;
            return {
              pid,
              name: parts[0],
              cpu: 0,
              // tasklist doesn't provide CPU info
              memory,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            };
          });
        } catch (fallbackError) {
          console.error("Failed to get Windows process info with fallback:", fallbackError);
          return [
            {
              pid: 0,
              name: "N/A",
              cpu: 0,
              memory: 0,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              error: "Process information is not available in this environment"
            }
          ];
        }
      }
    } else {
      console.warn(`Unsupported platform: ${platform}, using browser fallback`);
      return [
        {
          pid: 0,
          name: "N/A",
          cpu: 0,
          memory: 0,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          error: "Process information is not available in this environment"
        }
      ];
    }
    return processes;
  } catch (error) {
    console.error("Failed to get process info:", error);
    return [
      {
        pid: 0,
        name: "N/A",
        cpu: 0,
        memory: 0,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: "Process information is not available in this environment"
      }
    ];
  }
};
const getMockProcessInfo = () => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const randomCPU = () => Math.floor(Math.random() * 15);
  const randomHighCPU = () => 15 + Math.floor(Math.random() * 25);
  const randomMem = () => Math.floor(Math.random() * 5);
  const randomHighMem = () => 5 + Math.floor(Math.random() * 15);
  return [
    {
      pid: 1,
      name: "Browser",
      cpu: randomHighCPU(),
      memory: 25 + randomMem(),
      command: "Browser Process",
      timestamp
    },
    {
      pid: 2,
      name: "System",
      cpu: 5 + randomCPU(),
      memory: 10 + randomMem(),
      command: "System Process",
      timestamp
    },
    {
      pid: 3,
      name: "sitara",
      cpu: randomHighCPU(),
      memory: 15 + randomMem(),
      command: "Bolt AI Process",
      timestamp
    },
    {
      pid: 4,
      name: "node",
      cpu: randomCPU(),
      memory: randomHighMem(),
      command: "Node.js Process",
      timestamp
    },
    {
      pid: 5,
      name: "wrangler",
      cpu: randomCPU(),
      memory: randomMem(),
      command: "Wrangler Process",
      timestamp
    },
    {
      pid: 6,
      name: "vscode",
      cpu: randomCPU(),
      memory: 12 + randomMem(),
      command: "VS Code Process",
      timestamp
    },
    {
      pid: 7,
      name: "chrome",
      cpu: randomHighCPU(),
      memory: 20 + randomMem(),
      command: "Chrome Browser",
      timestamp
    },
    {
      pid: 8,
      name: "finder",
      cpu: 1 + randomCPU(),
      memory: 3 + randomMem(),
      command: "Finder Process",
      timestamp
    },
    {
      pid: 9,
      name: "terminal",
      cpu: 2 + randomCPU(),
      memory: 5 + randomMem(),
      command: "Terminal Process",
      timestamp
    },
    {
      pid: 10,
      name: "cloudflared",
      cpu: randomCPU(),
      memory: randomMem(),
      command: "Cloudflare Tunnel",
      timestamp
    }
  ];
};
const loader$o = async ({ request: _request }) => {
  try {
    return json(getProcessInfo());
  } catch (error) {
    console.error("Failed to get process info:", error);
    return json(getMockProcessInfo(), { status: 500 });
  }
};
const action$l = async ({ request: _request }) => {
  try {
    return json(getProcessInfo());
  } catch (error) {
    console.error("Failed to get process info:", error);
    return json(getMockProcessInfo(), { status: 500 });
  }
};

const route4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$l,
  loader: loader$o
}, Symbol.toStringTag, { value: 'Module' }));

async function loader$n({ request, context }) {
  const url = new URL(request.url);
  const uid = url.searchParams.get("uid");
  if (!uid) {
    return json({ error: "uid is required" }, { status: 400 });
  }
  const cloudflareEnv = context?.cloudflare?.env;
  const apiKey = process.env.SKETCHFAB_API_KEY || cloudflareEnv?.SKETCHFAB_API_KEY;
  if (!apiKey) {
    return json({ error: "SKETCHFAB_API_KEY not configured. Add it to your .env file." }, { status: 400 });
  }
  const dlInfoRes = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, {
    headers: { Authorization: `Token ${apiKey}`, Accept: "application/json" }
  }).catch((e) => {
    throw new Error(`Sketchfab API unreachable: ${e.message}`);
  });
  if (!dlInfoRes.ok) {
    let detail = "";
    try {
      const body = await dlInfoRes.json();
      detail = body.detail || body.error || JSON.stringify(body);
    } catch {
      detail = await dlInfoRes.text().catch(() => "");
    }
    return json({ error: `Sketchfab ${dlInfoRes.status}: ${detail}` }, { status: dlInfoRes.status });
  }
  const dlInfo = await dlInfoRes.json();
  const glbUrl = dlInfo.glb?.url || dlInfo.gltf?.url;
  if (!glbUrl) {
    return json(
      { error: "No downloadable GLB for this model. The author may not have enabled downloads." },
      { status: 404 }
    );
  }
  const glbRes = await fetch(glbUrl).catch((e) => {
    throw new Error(`GLB fetch failed: ${e.message}`);
  });
  if (!glbRes.ok) {
    return json({ error: `GLB download failed: ${glbRes.status}` }, { status: 502 });
  }
  const buffer = await glbRes.arrayBuffer();
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "model/gltf-binary",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "public, max-age=3600"
    }
  });
}

const route5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$n
}, Symbol.toStringTag, { value: 'Module' }));

async function action$k({ request }) {
  try {
    const body = await request.json();
    const { projectId, token } = body;
    if (!projectId || !token) {
      return json({ error: "Project ID and token are required" }, { status: 400 });
    }
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/api-keys`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      return json({ error: `Failed to fetch API keys: ${response.statusText}` }, { status: response.status });
    }
    const apiKeys = await response.json();
    return json({ apiKeys });
  } catch (error) {
    console.error("Error fetching project API keys:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error occurred" }, { status: 500 });
  }
}

const route6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$k
}, Symbol.toStringTag, { value: 'Module' }));

const loader$m = async ({ request, context }) => {
  const envVars = {
    hasGithubToken: Boolean(process.env.GITHUB_ACCESS_TOKEN || context.env?.GITHUB_ACCESS_TOKEN),
    hasNetlifyToken: Boolean(process.env.NETLIFY_TOKEN || context.env?.NETLIFY_TOKEN),
    nodeEnv: "production"
  };
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key) {
        acc[key] = value;
      }
      return acc;
    },
    {}
  );
  const hasGithubTokenCookie = Boolean(cookies.githubToken);
  const hasGithubUsernameCookie = Boolean(cookies.githubUsername);
  const hasNetlifyCookie = Boolean(cookies.netlifyToken);
  const localStorageStatus = {
    explanation: "Local storage can only be checked on the client side. Use browser devtools to check.",
    githubKeysToCheck: ["github_connection"],
    netlifyKeysToCheck: ["netlify_connection"]
  };
  const corsStatus = {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  };
  const apiEndpoints = {
    githubUser: "/api/system/git-info?action=getUser",
    githubRepos: "/api/system/git-info?action=getRepos",
    githubOrgs: "/api/system/git-info?action=getOrgs",
    githubActivity: "/api/system/git-info?action=getActivity",
    gitInfo: "/api/system/git-info"
  };
  let githubApiStatus;
  try {
    const githubResponse = await fetch("https://api.github.com/zen", {
      method: "GET",
      headers: {
        Accept: "application/vnd.github.v3+json"
      }
    });
    githubApiStatus = {
      isReachable: githubResponse.ok,
      status: githubResponse.status,
      statusText: githubResponse.statusText
    };
  } catch (error) {
    githubApiStatus = {
      isReachable: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
  let netlifyApiStatus;
  try {
    const netlifyResponse = await fetch("https://api.netlify.com/api/v1/", {
      method: "GET"
    });
    netlifyApiStatus = {
      isReachable: netlifyResponse.ok,
      status: netlifyResponse.status,
      statusText: netlifyResponse.statusText
    };
  } catch (error) {
    netlifyApiStatus = {
      isReachable: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
  const technicalDetails = {
    serverTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userAgent: request.headers.get("User-Agent"),
    referrer: request.headers.get("Referer"),
    host: request.headers.get("Host"),
    method: request.method,
    url: request.url
  };
  return json(
    {
      status: "success",
      environment: envVars,
      cookies: {
        hasGithubTokenCookie,
        hasGithubUsernameCookie,
        hasNetlifyCookie
      },
      localStorage: localStorageStatus,
      apiEndpoints,
      externalApis: {
        github: githubApiStatus,
        netlify: netlifyApiStatus
      },
      corsStatus,
      technicalDetails
    },
    {
      headers: corsStatus.headers
    }
  );
};

const route7 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$m
}, Symbol.toStringTag, { value: 'Module' }));

let execSync$1;
try {
  if (typeof process !== "undefined" && process.platform) {
    const childProcess = { execSync: null };
    execSync$1 = childProcess.execSync;
  }
} catch {
  console.log("Running in Cloudflare environment, child_process not available");
}
const isDevelopment = false;
const getSystemMemoryInfo = () => {
  try {
    if (!execSync$1 && !isDevelopment) {
      return {
        total: 0,
        free: 0,
        used: 0,
        percentage: 0,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: "System memory information is not available in this environment"
      };
    }
    if (!execSync$1 && isDevelopment) ;
    let memInfo = {
      total: 0,
      free: 0,
      used: 0,
      percentage: 0
    };
    const platform = process.platform;
    if (platform === "darwin") {
      const totalMemory = parseInt(execSync$1("sysctl -n hw.memsize").toString().trim(), 10);
      const vmStat = execSync$1("vm_stat").toString().trim();
      const pageSize = 4096;
      const matches = {
        free: /Pages free:\s+(\d+)/.exec(vmStat),
        active: /Pages active:\s+(\d+)/.exec(vmStat),
        inactive: /Pages inactive:\s+(\d+)/.exec(vmStat),
        speculative: /Pages speculative:\s+(\d+)/.exec(vmStat),
        wired: /Pages wired down:\s+(\d+)/.exec(vmStat),
        compressed: /Pages occupied by compressor:\s+(\d+)/.exec(vmStat)
      };
      const freePages = parseInt(matches.free?.[1] || "0", 10);
      const activePages = parseInt(matches.active?.[1] || "0", 10);
      const inactivePages = parseInt(matches.inactive?.[1] || "0", 10);
      const wiredPages = parseInt(matches.wired?.[1] || "0", 10);
      const compressedPages = parseInt(matches.compressed?.[1] || "0", 10);
      const freeMemory = freePages * pageSize;
      const usedMemory = (activePages + inactivePages + wiredPages + compressedPages) * pageSize;
      memInfo = {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        percentage: Math.round(usedMemory / totalMemory * 100)
      };
      try {
        const swapInfo = execSync$1("sysctl -n vm.swapusage").toString().trim();
        const swapMatches = {
          total: /total = (\d+\.\d+)M/.exec(swapInfo),
          used: /used = (\d+\.\d+)M/.exec(swapInfo),
          free: /free = (\d+\.\d+)M/.exec(swapInfo)
        };
        const swapTotal = parseFloat(swapMatches.total?.[1] || "0") * 1024 * 1024;
        const swapUsed = parseFloat(swapMatches.used?.[1] || "0") * 1024 * 1024;
        const swapFree = parseFloat(swapMatches.free?.[1] || "0") * 1024 * 1024;
        memInfo.swap = {
          total: swapTotal,
          used: swapUsed,
          free: swapFree,
          percentage: swapTotal > 0 ? Math.round(swapUsed / swapTotal * 100) : 0
        };
      } catch (swapError) {
        console.error("Failed to get swap info:", swapError);
      }
    } else if (platform === "linux") {
      const meminfo = execSync$1("cat /proc/meminfo").toString().trim();
      const memTotal = parseInt(/MemTotal:\s+(\d+)/.exec(meminfo)?.[1] || "0", 10) * 1024;
      const memAvailable = parseInt(/MemAvailable:\s+(\d+)/.exec(meminfo)?.[1] || "0", 10) * 1024;
      const usedMemory = memTotal - memAvailable;
      memInfo = {
        total: memTotal,
        free: memAvailable,
        used: usedMemory,
        percentage: Math.round(usedMemory / memTotal * 100)
      };
      const swapTotal = parseInt(/SwapTotal:\s+(\d+)/.exec(meminfo)?.[1] || "0", 10) * 1024;
      const swapFree = parseInt(/SwapFree:\s+(\d+)/.exec(meminfo)?.[1] || "0", 10) * 1024;
      const swapUsed = swapTotal - swapFree;
      memInfo.swap = {
        total: swapTotal,
        free: swapFree,
        used: swapUsed,
        percentage: swapTotal > 0 ? Math.round(swapUsed / swapTotal * 100) : 0
      };
    } else if (platform === "win32") {
      const memoryInfo = execSync$1(
        'powershell "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory | ConvertTo-Json"'
      ).toString().trim();
      const memData = JSON.parse(memoryInfo);
      const totalMemory = parseInt(memData.TotalVisibleMemorySize, 10) * 1024;
      const freeMemory = parseInt(memData.FreePhysicalMemory, 10) * 1024;
      const usedMemory = totalMemory - freeMemory;
      memInfo = {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        percentage: Math.round(usedMemory / totalMemory * 100)
      };
      try {
        const swapInfo = execSync$1(
          `powershell "Get-CimInstance Win32_PageFileUsage | Measure-Object -Property CurrentUsage, AllocatedBaseSize -Sum | Select-Object @{Name='CurrentUsage';Expression={$_.Sum}}, @{Name='AllocatedBaseSize';Expression={$_.Sum}} | ConvertTo-Json"`
        ).toString().trim();
        const swapData = JSON.parse(swapInfo);
        const swapTotal = parseInt(swapData.AllocatedBaseSize, 10) * 1024 * 1024;
        const swapUsed = parseInt(swapData.CurrentUsage, 10) * 1024 * 1024;
        const swapFree = swapTotal - swapUsed;
        memInfo.swap = {
          total: swapTotal,
          free: swapFree,
          used: swapUsed,
          percentage: swapTotal > 0 ? Math.round(swapUsed / swapTotal * 100) : 0
        };
      } catch (swapError) {
        console.error("Failed to get swap info:", swapError);
      }
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return {
      ...memInfo,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    console.error("Failed to get system memory info:", error);
    return {
      total: 0,
      free: 0,
      used: 0,
      percentage: 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
};
const loader$l = async ({ request: _request }) => {
  try {
    return json(getSystemMemoryInfo());
  } catch (error) {
    console.error("Failed to get system memory info:", error);
    return json(
      {
        total: 0,
        free: 0,
        used: 0,
        percentage: 0,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};
const action$j = async ({ request: _request }) => {
  try {
    return json(getSystemMemoryInfo());
  } catch (error) {
    console.error("Failed to get system memory info:", error);
    return json(
      {
        total: 0,
        free: 0,
        used: 0,
        percentage: 0,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

const route8 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$j,
  loader: loader$l
}, Symbol.toStringTag, { value: 'Module' }));

async function action$i({ context, request }) {
  const { messages, model, provider } = await request.json();
  const cookieHeader = request.headers.get("Cookie");
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);
  const chatText = messages.filter((m) => m.role === "user").map((m) => {
    const content = Array.isArray(m.content) ? m.content.find((c) => c.type === "text")?.text ?? "" : m.content;
    return content.replace(/^\[Model:.*?\]\n\n\[Provider:.*?\]\n\n/s, "").trim();
  }).filter(Boolean).slice(0, 6).join("\n---\n");
  const result = await streamText({
    messages: [
      {
        role: "user",
        content: `[Model: ${model}]

[Provider: ${provider.name}]

You are analyzing a website that was built through the following chat conversation. Create a REUSABLE TEMPLATE PROMPT that captures its structure and features, while keeping it fully customizable.

The template prompt MUST naturally include ALL four of these exact placeholders:
- {THEME} — light or dark theme
- {INDUSTRY} — type of business/website (e.g., pizza restaurant, automation agency, portfolio)
- {BRAND_NAME} — the company or product name
- {PRIMARY_COLOR} — the primary color scheme (e.g., warm orange, deep purple, electric blue)

Chat history that built this website:
${chatText}

Write a single cohesive template prompt (4–8 sentences) that:
1. Describes the website layout and sections
2. Mentions key UI patterns and features used
3. Embeds all 4 placeholders naturally in context
4. Is detailed enough to recreate a similar site but flexible for any industry

Reply with ONLY the template prompt — no explanations, no labels, no quotes.`
      }
    ],
    env: context.cloudflare?.env,
    apiKeys,
    providerSettings
  });
  const raw = await result.text;
  return new Response(JSON.stringify({ templatePrompt: raw.trim() }), {
    headers: { "Content-Type": "application/json" }
  });
}

const route9 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$i
}, Symbol.toStringTag, { value: 'Module' }));

let cachedProviders = null;
let cachedDefaultProvider = null;
function getProviderInfo(llmManager) {
  if (!cachedProviders) {
    cachedProviders = llmManager.getAllProviders().map((provider) => ({
      name: provider.name,
      staticModels: provider.staticModels,
      getApiKeyLink: provider.getApiKeyLink,
      labelForGetApiKey: provider.labelForGetApiKey,
      icon: provider.icon
    }));
  }
  if (!cachedDefaultProvider) {
    const defaultProvider = llmManager.getDefaultProvider();
    cachedDefaultProvider = {
      name: defaultProvider.name,
      staticModels: defaultProvider.staticModels,
      getApiKeyLink: defaultProvider.getApiKeyLink,
      labelForGetApiKey: defaultProvider.labelForGetApiKey,
      icon: defaultProvider.icon
    };
  }
  return { providers: cachedProviders, defaultProvider: cachedDefaultProvider };
}
async function loader$k({
  request,
  params,
  context
}) {
  const llmManager = LLMManager.getInstance(context.cloudflare?.env);
  const cookieHeader = request.headers.get("Cookie");
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);
  const { providers, defaultProvider } = getProviderInfo(llmManager);
  let modelList = [];
  if (params.provider) {
    const provider = llmManager.getProvider(params.provider);
    if (provider) {
      modelList = await llmManager.getModelListFromProvider(provider, {
        apiKeys,
        providerSettings,
        serverEnv: context.cloudflare?.env
      });
    }
  } else {
    modelList = await llmManager.updateModelList({
      apiKeys,
      providerSettings,
      serverEnv: context.cloudflare?.env
    });
  }
  return json({
    modelList,
    providers,
    defaultProvider
  });
}

const route33 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$k
}, Symbol.toStringTag, { value: 'Module' }));

const route10 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$k
}, Symbol.toStringTag, { value: 'Module' }));

async function loader$j({ request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "architecture";
  const category = url.searchParams.get("category") || "";
  const count = Math.min(Number(url.searchParams.get("count") || "16"), 24);
  const cursor = url.searchParams.get("cursor") || "";
  const license = url.searchParams.get("license") || "cc0";
  const params = new URLSearchParams({
    q,
    type: "models",
    count: String(count),
    downloadable: "true",
    ...category ? { categories: category } : {},
    ...cursor ? { cursor } : {},
    ...{ license } 
  });
  try {
    const res = await fetch(`https://api.sketchfab.com/v3/models?${params}`, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) {
      return json({ error: `Sketchfab API error: ${res.status}`, results: [], nextCursor: null }, { status: 200 });
    }
    const data = await res.json();
    const results = (data.results ?? []).map((m) => {
      const images = m.thumbnails?.images ?? [];
      const thumb = images.find((i) => i.width >= 200) ?? images[0];
      return {
        uid: m.uid,
        name: m.name,
        author: m.user?.username ?? "",
        license: m.license?.label ?? "CC BY",
        thumbnail: thumb?.url ?? "",
        embedUrl: `https://sketchfab.com/models/${m.uid}/embed`
      };
    });
    return json({ results, nextCursor: data.cursors?.next ?? null });
  } catch (err) {
    return json({ error: err.message ?? "Network error", results: [], nextCursor: null });
  }
}

const route11 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$j
}, Symbol.toStringTag, { value: 'Module' }));

let execSync;
try {
  if (typeof process !== "undefined" && process.platform) {
    const childProcess = { execSync: null };
    execSync = childProcess.execSync;
  }
} catch {
  console.log("Running in Cloudflare environment, child_process not available");
}
const getDiskInfo = () => {
  if (!execSync && true) {
    return [
      {
        filesystem: "N/A",
        size: 0,
        used: 0,
        available: 0,
        percentage: 0,
        mountpoint: "N/A",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: "Disk information is not available in this environment"
      }
    ];
  }
  try {
    const platform = process.platform;
    let disks = [];
    if (platform === "darwin") {
      try {
        const output = execSync("df -k", { encoding: "utf-8" }).toString().trim();
        const lines = output.split("\n").slice(1);
        disks = lines.map((line) => {
          const parts = line.trim().split(/\s+/);
          const filesystem = parts[0];
          const size = parseInt(parts[1], 10) * 1024;
          const used = parseInt(parts[2], 10) * 1024;
          const available = parseInt(parts[3], 10) * 1024;
          const percentageStr = parts[4].replace("%", "");
          const percentage = parseInt(percentageStr, 10);
          const mountpoint = parts[5];
          return {
            filesystem,
            size,
            used,
            available,
            percentage,
            mountpoint,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        });
        disks = disks.filter(
          (disk) => !disk.filesystem.startsWith("devfs") && !disk.filesystem.startsWith("map") && !disk.mountpoint.startsWith("/System/Volumes") && disk.size > 0
        );
      } catch (error) {
        console.error("Failed to get macOS disk info:", error);
        return [
          {
            filesystem: "Unknown",
            size: 0,
            used: 0,
            available: 0,
            percentage: 0,
            mountpoint: "/",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            error: error instanceof Error ? error.message : "Unknown error"
          }
        ];
      }
    } else if (platform === "linux") {
      try {
        const output = execSync("df -k", { encoding: "utf-8" }).toString().trim();
        const lines = output.split("\n").slice(1);
        disks = lines.map((line) => {
          const parts = line.trim().split(/\s+/);
          const filesystem = parts[0];
          const size = parseInt(parts[1], 10) * 1024;
          const used = parseInt(parts[2], 10) * 1024;
          const available = parseInt(parts[3], 10) * 1024;
          const percentageStr = parts[4].replace("%", "");
          const percentage = parseInt(percentageStr, 10);
          const mountpoint = parts[5];
          return {
            filesystem,
            size,
            used,
            available,
            percentage,
            mountpoint,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        });
        disks = disks.filter(
          (disk) => !disk.filesystem.startsWith("/dev/loop") && !disk.filesystem.startsWith("tmpfs") && !disk.filesystem.startsWith("devtmpfs") && disk.size > 0
        );
      } catch (error) {
        console.error("Failed to get Linux disk info:", error);
        return [
          {
            filesystem: "Unknown",
            size: 0,
            used: 0,
            available: 0,
            percentage: 0,
            mountpoint: "/",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            error: error instanceof Error ? error.message : "Unknown error"
          }
        ];
      }
    } else if (platform === "win32") {
      try {
        const output = execSync(
          `powershell "Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free, @{Name='Size';Expression={$_.Used + $_.Free}} | ConvertTo-Json"`,
          { encoding: "utf-8" }
        ).toString().trim();
        const driveData = JSON.parse(output);
        const drivesArray = Array.isArray(driveData) ? driveData : [driveData];
        disks = drivesArray.map((drive) => {
          const size = drive.Size || 0;
          const used = drive.Used || 0;
          const available = drive.Free || 0;
          const percentage = size > 0 ? Math.round(used / size * 100) : 0;
          return {
            filesystem: drive.Name + ":\\",
            size,
            used,
            available,
            percentage,
            mountpoint: drive.Name + ":\\",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        });
      } catch (error) {
        console.error("Failed to get Windows disk info:", error);
        return [
          {
            filesystem: "Unknown",
            size: 0,
            used: 0,
            available: 0,
            percentage: 0,
            mountpoint: "C:\\",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            error: error instanceof Error ? error.message : "Unknown error"
          }
        ];
      }
    } else {
      console.warn(`Unsupported platform: ${platform}`);
      return [
        {
          filesystem: "Unknown",
          size: 0,
          used: 0,
          available: 0,
          percentage: 0,
          mountpoint: "/",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          error: `Unsupported platform: ${platform}`
        }
      ];
    }
    return disks;
  } catch (error) {
    console.error("Failed to get disk info:", error);
    return [
      {
        filesystem: "Unknown",
        size: 0,
        used: 0,
        available: 0,
        percentage: 0,
        mountpoint: "/",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      }
    ];
  }
};
const loader$i = async ({ request: _request }) => {
  try {
    return json(getDiskInfo());
  } catch (error) {
    console.error("Failed to get disk info:", error);
    return json(
      [
        {
          filesystem: "Unknown",
          size: 0,
          used: 0,
          available: 0,
          percentage: 0,
          mountpoint: "/",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          error: error instanceof Error ? error.message : "Unknown error"
        }
      ],
      { status: 500 }
    );
  }
};
const action$h = async ({ request: _request }) => {
  try {
    return json(getDiskInfo());
  } catch (error) {
    console.error("Failed to get disk info:", error);
    return json(
      [
        {
          filesystem: "Unknown",
          size: 0,
          used: 0,
          available: 0,
          percentage: 0,
          mountpoint: "/",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          error: error instanceof Error ? error.message : "Unknown error"
        }
      ],
      { status: 500 }
    );
  }
};

const route12 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$h,
  loader: loader$i
}, Symbol.toStringTag, { value: 'Module' }));

const loader$h = async ({ context, request }) => {
  const cookieHeader = request.headers.get("Cookie");
  const apiKeysFromCookie = getApiKeysFromCookie(cookieHeader);
  const llmManager = LLMManager.getInstance(context?.cloudflare?.env);
  const providers = llmManager.getAllProviders();
  const apiKeys = { ...apiKeysFromCookie };
  for (const provider of providers) {
    if (!provider.config.apiTokenKey) {
      continue;
    }
    const envVarName = provider.config.apiTokenKey;
    if (apiKeys[provider.name]) {
      continue;
    }
    const envValue = context?.cloudflare?.env?.[envVarName] || process.env[envVarName] || llmManager.env[envVarName];
    if (envValue) {
      apiKeys[provider.name] = envValue;
    }
  }
  return Response.json(apiKeys);
};

const route13 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$h
}, Symbol.toStringTag, { value: 'Module' }));

async function loader$g({ request, context }) {
  const url = new URL(request.url);
  const repo = url.searchParams.get("repo");
  if (!repo) {
    return json({ error: "Repository name is required" }, { status: 400 });
  }
  const githubToken = context?.cloudflare?.env?.GITHUB_TOKEN || context?.cloudflare?.env?.VITE_GITHUB_ACCESS_TOKEN || process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_ACCESS_TOKEN;
  try {
    const baseUrl = "https://api.github.com";
    const commonHeaders = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "sitara-builder/1.0",
      ...githubToken ? { Authorization: `Bearer ${githubToken}` } : {}
    };
    const releaseResponse = await fetch(`${baseUrl}/repos/${repo}/releases/latest`, {
      headers: commonHeaders
    });
    if (!releaseResponse.ok) {
      const body = await releaseResponse.text();
      console.error(`GitHub API ${releaseResponse.status} for ${repo}:`, body, "| token present:", !!githubToken);
      throw new Error(`GitHub API error: ${releaseResponse.status}`);
    }
    const releaseData = await releaseResponse.json();
    const zipballUrl = releaseData.zipball_url;
    const zipResponse = await fetch(zipballUrl, {
      headers: commonHeaders
    });
    if (!zipResponse.ok) {
      throw new Error(`Failed to fetch release zipball: ${zipResponse.status}`);
    }
    const zipArrayBuffer = await zipResponse.arrayBuffer();
    const zip = await JSZip.loadAsync(zipArrayBuffer);
    let rootFolderName = "";
    zip.forEach((relativePath) => {
      if (!rootFolderName && relativePath.includes("/")) {
        rootFolderName = relativePath.split("/")[0];
      }
    });
    const promises = Object.keys(zip.files).map(async (filename) => {
      const zipEntry = zip.files[filename];
      if (zipEntry.dir) {
        return null;
      }
      if (filename === rootFolderName) {
        return null;
      }
      let normalizedPath = filename;
      if (rootFolderName && filename.startsWith(rootFolderName + "/")) {
        normalizedPath = filename.substring(rootFolderName.length + 1);
      }
      const content = await zipEntry.async("string");
      return {
        name: normalizedPath.split("/").pop() || "",
        path: normalizedPath,
        content
      };
    });
    const results = await Promise.all(promises);
    const fileList = results.filter(Boolean);
    return json(fileList);
  } catch (error) {
    console.error("Error processing GitHub template:", error);
    return json({ error: "Failed to fetch template files" }, { status: 500 });
  }
}

const route14 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$g
}, Symbol.toStringTag, { value: 'Module' }));

var define_PKG_DEPENDENCIES_default = { "@ai-sdk/amazon-bedrock": "1.0.6", "@ai-sdk/anthropic": "0.0.39", "@ai-sdk/cohere": "1.0.3", "@ai-sdk/deepseek": "0.1.3", "@ai-sdk/google": "0.0.52", "@ai-sdk/mistral": "0.0.43", "@ai-sdk/openai": "1.1.2", "@codemirror/autocomplete": "^6.18.3", "@codemirror/commands": "^6.7.1", "@codemirror/lang-cpp": "^6.0.2", "@codemirror/lang-css": "^6.3.1", "@codemirror/lang-html": "^6.4.9", "@codemirror/lang-javascript": "^6.2.2", "@codemirror/lang-json": "^6.0.1", "@codemirror/lang-markdown": "^6.3.1", "@codemirror/lang-python": "^6.1.6", "@codemirror/lang-sass": "^6.0.2", "@codemirror/lang-vue": "^0.1.3", "@codemirror/lang-wast": "^6.0.2", "@codemirror/language": "^6.10.6", "@codemirror/search": "^6.5.8", "@codemirror/state": "^6.4.1", "@codemirror/view": "^6.35.0", "@headlessui/react": "^2.2.0", "@heroicons/react": "^2.2.0", "@iconify-json/svg-spinners": "^1.2.1", "@lezer/highlight": "^1.2.1", "@nanostores/react": "^0.7.3", "@octokit/rest": "^21.0.2", "@octokit/types": "^13.6.2", "@openrouter/ai-sdk-provider": "^0.0.5", "@phosphor-icons/react": "^2.1.7", "@radix-ui/react-checkbox": "^1.1.4", "@radix-ui/react-collapsible": "^1.0.3", "@radix-ui/react-context-menu": "^2.2.2", "@radix-ui/react-dialog": "^1.1.5", "@radix-ui/react-dropdown-menu": "^2.1.6", "@radix-ui/react-label": "^2.1.1", "@radix-ui/react-popover": "^1.1.5", "@radix-ui/react-progress": "^1.0.3", "@radix-ui/react-scroll-area": "^1.2.2", "@radix-ui/react-separator": "^1.1.0", "@radix-ui/react-switch": "^1.1.1", "@radix-ui/react-tabs": "^1.1.2", "@radix-ui/react-tooltip": "^1.1.4", "@remix-run/cloudflare": "^2.15.2", "@remix-run/cloudflare-pages": "^2.15.2", "@remix-run/node": "^2.15.2", "@remix-run/react": "^2.15.2", "@tanstack/react-virtual": "^3.13.0", "@types/react-beautiful-dnd": "^13.1.8", "@uiw/codemirror-theme-vscode": "^4.23.6", "@unocss/reset": "^0.61.9", "@webcontainer/api": "1.6.1-internal.1", "@xterm/addon-fit": "^0.10.0", "@xterm/addon-web-links": "^0.11.0", "@xterm/xterm": "^5.5.0", ai: "4.1.2", bcryptjs: "^3.0.3", chalk: "^5.4.1", "chart.js": "^4.4.7", "class-variance-authority": "^0.7.0", clsx: "^2.1.0", "date-fns": "^3.6.0", diff: "^5.2.0", dotenv: "^16.4.7", "electron-log": "^5.2.3", "electron-store": "^10.0.0", "electron-updater": "^6.3.9", "file-saver": "^2.0.5", "framer-motion": "^11.12.0", ignore: "^6.0.2", isbot: "^4.4.0", "isomorphic-git": "^1.27.2", istextorbinary: "^9.5.0", jose: "^5.9.6", "js-cookie": "^3.0.5", jspdf: "^2.5.2", jszip: "^3.10.1", "lucide-react": "^0.485.0", mime: "^4.0.4", mongodb: "^7.3.0", nanostores: "^0.10.3", "ollama-ai-provider": "^0.15.2", "path-browserify": "^1.0.1", react: "^18.3.1", "react-beautiful-dnd": "^13.1.1", "react-chartjs-2": "^5.3.0", "react-dnd": "^16.0.1", "react-dnd-html5-backend": "^16.0.1", "react-dom": "^18.3.1", "react-hotkeys-hook": "^4.6.1", "react-icons": "^5.4.0", "react-markdown": "^9.0.1", "react-qrcode-logo": "^3.0.0", "react-resizable-panels": "^2.1.7", "react-toastify": "^10.0.6", "react-window": "^1.8.11", "rehype-raw": "^7.0.0", "rehype-sanitize": "^6.0.0", "remark-gfm": "^4.0.0", "remix-island": "^0.2.0", "remix-utils": "^7.7.0", "rollup-plugin-node-polyfills": "^0.2.1", shiki: "^1.24.0", "tailwind-merge": "^2.2.1", "unist-util-visit": "^5.0.0", "use-debounce": "^10.0.4", "vite-plugin-node-polyfills": "^0.22.0", zod: "^3.24.1", zustand: "^5.0.3" };
var define_PKG_DEV_DEPENDENCIES_default = { "@blitz/eslint-plugin": "0.1.0", "@cloudflare/workers-types": "^4.20241127.0", "@electron/notarize": "^2.5.0", "@iconify-json/ph": "^1.2.1", "@iconify/types": "^2.0.0", "@remix-run/dev": "^2.15.2", "@remix-run/serve": "^2.15.2", "@testing-library/jest-dom": "^6.6.3", "@testing-library/react": "^16.2.0", "@types/bcryptjs": "^3.0.0", "@types/diff": "^5.2.3", "@types/dom-speech-recognition": "^0.0.4", "@types/electron": "^1.6.12", "@types/file-saver": "^2.0.7", "@types/js-cookie": "^3.0.6", "@types/path-browserify": "^1.0.3", "@types/react": "^18.3.12", "@types/react-dom": "^18.3.1", "@types/react-window": "^1.8.8", "@vitejs/plugin-react": "^4.3.4", concurrently: "^8.2.2", "cross-env": "^7.0.3", "crypto-browserify": "^3.12.1", electron: "^33.2.0", "electron-builder": "^25.1.8", "eslint-config-prettier": "^10.1.1", "eslint-plugin-prettier": "^5.2.6", "fast-glob": "^3.3.2", husky: "9.1.7", "is-ci": "^3.0.1", jsdom: "^26.0.0", "node-fetch": "^3.3.2", pnpm: "^9.14.4", prettier: "^3.5.3", rimraf: "^4.4.1", "sass-embedded": "^1.81.0", "stream-browserify": "^3.0.0", typescript: "^5.7.2", unified: "^11.0.5", unocss: "^0.61.9", vite: "^5.4.11", "vite-plugin-copy": "^0.1.6", "vite-plugin-optimize-css-modules": "^1.1.0", "vite-tsconfig-paths": "^4.3.2", vitest: "^2.1.7", wrangler: "^4.5.1" };
var define_PKG_OPTIONAL_DEPENDENCIES_default = {};
var define_PKG_PEER_DEPENDENCIES_default = {};
const getGitInfo = () => {
  return {
    commitHash: "109b9eb",
    branch: "stable",
    commitTime: "Tue Jun 16 07:26:30 2026 +0500",
    author: "usman",
    email: "theusman620@gmail.com",
    remoteUrl: "https://github.com/the-usman/sitara-builder.git",
    repoName: "the-usman/sitara-builder"
  };
};
const formatDependencies = (deps, type) => {
  return Object.entries(deps || {}).map(([name, version]) => ({
    name,
    version: version.replace(/^\^|~/, ""),
    type
  }));
};
const getAppResponse = () => {
  const gitInfo = getGitInfo();
  return {
    name: "sitara-builder",
    version: "1.0.0",
    description: "Sitara Builder — AI-Powered Full-Stack Web Development",
    license: "MIT",
    environment: "cloudflare",
    gitInfo,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    runtimeInfo: {
      nodeVersion: "cloudflare"
    },
    dependencies: {
      production: formatDependencies(define_PKG_DEPENDENCIES_default, "production"),
      development: formatDependencies(define_PKG_DEV_DEPENDENCIES_default, "development"),
      peer: formatDependencies(define_PKG_PEER_DEPENDENCIES_default, "peer"),
      optional: formatDependencies(define_PKG_OPTIONAL_DEPENDENCIES_default, "optional")
    }
  };
};
const loader$f = async ({ request: _request }) => {
  try {
    return json(getAppResponse());
  } catch (error) {
    console.error("Failed to get webapp info:", error);
    return json(
      {
        name: "sitara-builder",
        version: "0.0.0",
        description: "Error fetching app info",
        license: "MIT",
        environment: "error",
        gitInfo: {
          commitHash: "error",
          branch: "unknown",
          commitTime: "unknown",
          author: "unknown",
          email: "unknown",
          remoteUrl: "unknown",
          repoName: "unknown"
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        runtimeInfo: { nodeVersion: "unknown" },
        dependencies: {
          production: [],
          development: [],
          peer: [],
          optional: []
        }
      },
      { status: 500 }
    );
  }
};
const action$g = async ({ request: _request }) => {
  try {
    return json(getAppResponse());
  } catch (error) {
    console.error("Failed to get webapp info:", error);
    return json(
      {
        name: "sitara-builder",
        version: "0.0.0",
        description: "Error fetching app info",
        license: "MIT",
        environment: "error",
        gitInfo: {
          commitHash: "error",
          branch: "unknown",
          commitTime: "unknown",
          author: "unknown",
          email: "unknown",
          remoteUrl: "unknown",
          repoName: "unknown"
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        runtimeInfo: { nodeVersion: "unknown" },
        dependencies: {
          production: [],
          development: [],
          peer: [],
          optional: []
        }
      },
      { status: 500 }
    );
  }
};

const route15 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$g,
  loader: loader$f
}, Symbol.toStringTag, { value: 'Module' }));

const loader$e = async ({ request, context }) => {
  console.log("Git info API called with URL:", request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  console.log("Git info action:", action);
  if (action === "getUser" || action === "getRepos" || action === "getOrgs" || action === "getActivity") {
    const serverGithubToken = process.env.GITHUB_ACCESS_TOKEN || context.env?.GITHUB_ACCESS_TOKEN;
    const cookieToken = request.headers.get("Cookie")?.split(";").find((cookie) => cookie.trim().startsWith("githubToken="))?.split("=")[1];
    const authHeader = request.headers.get("Authorization");
    const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const token = serverGithubToken || headerToken || cookieToken;
    console.log(
      "Using GitHub token from:",
      serverGithubToken ? "server env" : headerToken ? "auth header" : cookieToken ? "cookie" : "none"
    );
    if (!token) {
      console.error("No GitHub token available");
      return json(
        { error: "No GitHub token available" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
          }
        }
      );
    }
    try {
      if (action === "getUser") {
        const response = await fetch("https://api.github.com/user", {
          headers: {
            Accept: "application/vnd.github.v3+json",
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          console.error("GitHub user API error:", response.status);
          throw new Error(`GitHub API error: ${response.status}`);
        }
        const userData = await response.json();
        return json(
          { user: userData },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
            }
          }
        );
      }
      if (action === "getRepos") {
        const reposResponse = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
          headers: {
            Accept: "application/vnd.github.v3+json",
            Authorization: `Bearer ${token}`
          }
        });
        if (!reposResponse.ok) {
          console.error("GitHub repos API error:", reposResponse.status);
          throw new Error(`GitHub API error: ${reposResponse.status}`);
        }
        const repos = await reposResponse.json();
        const gistsResponse = await fetch("https://api.github.com/gists", {
          headers: {
            Accept: "application/vnd.github.v3+json",
            Authorization: `Bearer ${token}`
          }
        });
        const gists = gistsResponse.ok ? await gistsResponse.json() : [];
        const languageStats = {};
        let totalStars = 0;
        let totalForks = 0;
        for (const repo of repos) {
          totalStars += repo.stargazers_count || 0;
          totalForks += repo.forks_count || 0;
          if (repo.language && repo.language !== "null") {
            languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
          }
        }
        return json(
          {
            repos,
            stats: {
              totalStars,
              totalForks,
              languages: languageStats,
              totalGists: gists.length
            }
          },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
            }
          }
        );
      }
      if (action === "getOrgs") {
        const response = await fetch("https://api.github.com/user/orgs", {
          headers: {
            Accept: "application/vnd.github.v3+json",
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          console.error("GitHub orgs API error:", response.status);
          throw new Error(`GitHub API error: ${response.status}`);
        }
        const orgs = await response.json();
        return json(
          { organizations: orgs },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
            }
          }
        );
      }
      if (action === "getActivity") {
        const username = request.headers.get("Cookie")?.split(";").find((cookie) => cookie.trim().startsWith("githubUsername="))?.split("=")[1];
        if (!username) {
          console.error("GitHub username not found in cookies");
          return json(
            { error: "GitHub username not found in cookies" },
            {
              status: 400,
              headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
              }
            }
          );
        }
        const response = await fetch(`https://api.github.com/users/${username}/events?per_page=30`, {
          headers: {
            Accept: "application/vnd.github.v3+json",
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          console.error("GitHub activity API error:", response.status);
          throw new Error(`GitHub API error: ${response.status}`);
        }
        const events = await response.json();
        return json(
          { recentActivity: events },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
            }
          }
        );
      }
    } catch (error) {
      console.error("GitHub API error:", error);
      return json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
          }
        }
      );
    }
  }
  const gitInfo = {
    local: {
      commitHash: "109b9eb" ,
      branch: "stable" ,
      commitTime: "Tue Jun 16 07:26:30 2026 +0500" ,
      author: "usman" ,
      email: "theusman620@gmail.com" ,
      remoteUrl: "https://github.com/the-usman/sitara-builder.git" ,
      repoName: "the-usman/sitara-builder" 
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  return json(gitInfo, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }
  });
};

const route16 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$e
}, Symbol.toStringTag, { value: 'Module' }));

const SIZE_TO_FAL = {
  "1024x1024": "square",
  "1792x1024": "landscape_16_9",
  "1024x1792": "portrait_16_9"
};
const SIZE_TO_GEMINI = {
  "1024x1024": "1:1",
  "1792x1024": "16:9",
  "1024x1792": "9:16"
};
async function action$f({ context, request }) {
  const {
    prompt,
    size = "1024x1024",
    provider = "fal",
    model
  } = await request.json();
  if (!prompt?.trim()) {
    throw new Response("Prompt is required", { status: 400 });
  }
  const cookieHeader = request.headers.get("Cookie");
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const env = context.cloudflare?.env;
  const slug = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) + ".png";
  if (provider === "fal") {
    return await generateWithFal({ prompt, size, model: model || "fal-ai/flux/schnell", apiKeys, env, slug });
  }
  if (provider === "gemini") {
    return await generateWithGemini({ prompt, size, apiKeys, env, slug });
  }
  return await generateWithOpenAI({ prompt, size, model: model || "dall-e-3", apiKeys, env, slug });
}
async function generateWithFal({
  prompt,
  size,
  model,
  apiKeys,
  env,
  slug
}) {
  const falKey = apiKeys?.FAL_KEY || env?.FAL_KEY || process.env.FAL_KEY;
  if (!falKey) {
    throw new Response("FAL_KEY not configured. Add it in Settings → API Keys.", { status: 401 });
  }
  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${falKey}`
    },
    body: JSON.stringify({
      prompt,
      image_size: SIZE_TO_FAL[size] ?? "square",
      num_inference_steps: model.includes("schnell") ? 4 : 28,
      num_images: 1,
      enable_safety_checker: true
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Response(err?.detail || "fal.ai generation failed", { status: res.status });
  }
  const data = await res.json();
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) {
    throw new Response("No image returned from fal.ai", { status: 502 });
  }
  const imgRes = await fetch(imageUrl);
  const buffer = await imgRes.arrayBuffer();
  const imageData = Buffer.from(buffer).toString("base64");
  return new Response(JSON.stringify({ imageData, filename: slug }), {
    headers: { "Content-Type": "application/json" }
  });
}
async function generateWithGemini({
  prompt,
  size,
  apiKeys,
  env,
  slug
}) {
  const geminiKey = apiKeys?.GOOGLE_GENERATIVE_AI_API_KEY || env?.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!geminiKey) {
    throw new Response("GOOGLE_GENERATIVE_AI_API_KEY not configured. Add it in Settings → API Keys.", { status: 401 });
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: SIZE_TO_GEMINI[size] ?? "1:1"
        }
      })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Response(err?.error?.message || "Gemini Imagen generation failed", { status: res.status });
  }
  const data = await res.json();
  const imageData = data.predictions?.[0]?.bytesBase64Encoded;
  if (!imageData) {
    throw new Response("No image returned from Gemini", { status: 502 });
  }
  return new Response(JSON.stringify({ imageData, filename: slug }), {
    headers: { "Content-Type": "application/json" }
  });
}
async function generateWithOpenAI({
  prompt,
  size,
  model,
  apiKeys,
  env,
  slug
}) {
  const openaiKey = apiKeys?.OPENAI_API_KEY || env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Response("OPENAI_API_KEY not configured. Add it in Settings → API Keys.", { status: 401 });
  }
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`
    },
    body: JSON.stringify({ model, prompt, n: 1, size, response_format: "b64_json" })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Response(err?.error?.message || "OpenAI generation failed", { status: res.status });
  }
  const data = await res.json();
  const imageData = data.data[0].b64_json;
  return new Response(JSON.stringify({ imageData, filename: slug }), {
    headers: { "Content-Type": "application/json" }
  });
}

const route17 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$f
}, Symbol.toStringTag, { value: 'Module' }));

if (typeof navigator === "undefined" || navigator.userAgent !== "Cloudflare-Workers") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {
  }
}
const MONGODB_URI$2 = process.env.MONGODB_URI || "mongodb+srv://the-usman:Usm123000@cluster0.gqzyjmn.mongodb.net/";
const DB_NAME$1 = "project_db_client";
const COLLECTION$1 = "web_builders";
async function getCollection() {
  const client = new MongoClient(MONGODB_URI$2);
  await client.connect();
  const collection = client.db(DB_NAME$1).collection(COLLECTION$1);
  return { collection, client };
}
async function upsertChat(trackingId, name, createdBy, selectedClient, modelKey, modelUsage, clientChatId) {
  const { collection, client } = await getCollection();
  try {
    const now = /* @__PURE__ */ new Date();
    await collection.updateOne(
      { trackingId },
      {
        $set: {
          name: name || trackingId,
          createdBy,
          client: selectedClient,
          updatedAt: now,
          [`models.${modelKey}.model`]: modelUsage.model,
          [`models.${modelKey}.provider`]: modelUsage.provider,
          ...clientChatId ? { clientChatId } : {}
        },
        // NOTE: a field must NOT appear in both $setOnInsert and $inc — MongoDB
        // rejects the whole upsert as a path conflict. $inc creates fields from 0.
        $setOnInsert: { trackingId, createdAt: now },
        // Accumulate token usage and cost across responses, per model and chat-wide
        $inc: {
          [`models.${modelKey}.promptTokens`]: modelUsage.promptTokens,
          [`models.${modelKey}.completionTokens`]: modelUsage.completionTokens,
          [`models.${modelKey}.totalTokens`]: modelUsage.totalTokens,
          [`models.${modelKey}.promptCost`]: modelUsage.promptCost,
          [`models.${modelKey}.completionCost`]: modelUsage.completionCost,
          [`models.${modelKey}.cost`]: modelUsage.cost,
          totalTokens: modelUsage.totalTokens,
          totalCost: modelUsage.cost
        }
      },
      { upsert: true }
    );
  } finally {
    await client.close();
  }
}
async function updateChatUrl(clientChatId, field, url) {
  const { collection, client } = await getCollection();
  try {
    await collection.updateOne(
      { clientChatId },
      { $set: { [field]: url, updatedAt: /* @__PURE__ */ new Date() } }
    );
  } finally {
    await client.close();
  }
}
async function getChats(userId, role) {
  const { collection, client } = await getCollection();
  try {
    const filter = role === "super_admin" ? {} : { "createdBy.userId": userId };
    return await collection.find(filter).sort({ updatedAt: -1 }).toArray();
  } finally {
    await client.close();
  }
}
const upsertProject = upsertChat;
const updateProjectUrl = updateChatUrl;

async function sha1(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
async function action$e({ request }) {
  try {
    const { siteId, files, token, chatId } = await request.json();
    if (!token) {
      return json({ error: "Not connected to Netlify" }, { status: 401 });
    }
    let targetSiteId = siteId;
    let siteInfo;
    if (!targetSiteId) {
      const siteName = `sitara-builder-${chatId}-${Date.now()}`;
      const createSiteResponse = await fetch("https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: siteName,
          custom_domain: null
        })
      });
      if (!createSiteResponse.ok) {
        return json({ error: "Failed to create site" }, { status: 400 });
      }
      const newSite = await createSiteResponse.json();
      targetSiteId = newSite.id;
      siteInfo = {
        id: newSite.id,
        name: newSite.name,
        url: newSite.url,
        chatId
      };
    } else {
      if (targetSiteId) {
        const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (siteResponse.ok) {
          const existingSite = await siteResponse.json();
          siteInfo = {
            id: existingSite.id,
            name: existingSite.name,
            url: existingSite.url,
            chatId
          };
        } else {
          targetSiteId = void 0;
        }
      }
      if (!targetSiteId) {
        const siteName = `sitara-builder-${chatId}-${Date.now()}`;
        const createSiteResponse = await fetch("https://api.netlify.com/api/v1/sites", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: siteName,
            custom_domain: null
          })
        });
        if (!createSiteResponse.ok) {
          return json({ error: "Failed to create site" }, { status: 400 });
        }
        const newSite = await createSiteResponse.json();
        targetSiteId = newSite.id;
        siteInfo = {
          id: newSite.id,
          name: newSite.name,
          url: newSite.url,
          chatId
        };
      }
    }
    const fileDigests = {};
    for (const [filePath, content] of Object.entries(files)) {
      const normalizedPath = filePath.startsWith("/") ? filePath : "/" + filePath;
      const hash = await sha1(content);
      fileDigests[normalizedPath] = hash;
    }
    const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}/deploys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        files: fileDigests,
        async: true,
        skip_processing: false,
        draft: false,
        // Change this to false for production deployments
        function_schedules: [],
        required: Object.keys(fileDigests),
        // Add this line
        framework: null
      })
    });
    if (!deployResponse.ok) {
      return json({ error: "Failed to create deployment" }, { status: 400 });
    }
    const deploy = await deployResponse.json();
    let retryCount = 0;
    const maxRetries = 60;
    while (retryCount < maxRetries) {
      const statusResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}/deploys/${deploy.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const status = await statusResponse.json();
      if (status.state === "prepared" || status.state === "uploaded") {
        for (const [filePath, content] of Object.entries(files)) {
          const normalizedPath = filePath.startsWith("/") ? filePath : "/" + filePath;
          let uploadSuccess = false;
          let uploadRetries = 0;
          while (!uploadSuccess && uploadRetries < 3) {
            try {
              const uploadResponse = await fetch(
                `https://api.netlify.com/api/v1/deploys/${deploy.id}/files${normalizedPath}`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/octet-stream"
                  },
                  body: content
                }
              );
              uploadSuccess = uploadResponse.ok;
              if (!uploadSuccess) {
                console.error("Upload failed:", await uploadResponse.text());
                uploadRetries++;
                await new Promise((resolve) => setTimeout(resolve, 2e3));
              }
            } catch (error) {
              console.error("Upload error:", error);
              uploadRetries++;
              await new Promise((resolve) => setTimeout(resolve, 2e3));
            }
          }
          if (!uploadSuccess) {
            return json({ error: `Failed to upload file ${filePath}` }, { status: 500 });
          }
        }
      }
      if (status.state === "ready") {
        if (Object.keys(files).length === 0 || status.summary?.status === "ready") {
          const deployUrl = status.ssl_url || status.url;
          if (chatId && deployUrl) {
            updateProjectUrl(chatId, "netlifyUrl", deployUrl).catch(console.error);
          }
          return json({
            success: true,
            deploy: {
              id: status.id,
              state: status.state,
              url: deployUrl
            },
            site: siteInfo
          });
        }
      }
      if (status.state === "error") {
        return json({ error: status.error_message || "Deploy preparation failed" }, { status: 500 });
      }
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    }
    if (retryCount >= maxRetries) {
      return json({ error: "Deploy preparation timed out" }, { status: 500 });
    }
    return json({
      success: true,
      deploy: {
        id: deploy.id,
        state: deploy.state
      },
      site: siteInfo
    });
  } catch (error) {
    console.error("Deploy error:", error);
    return json({ error: "Deployment failed" }, { status: 500 });
  }
}

const route18 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$e
}, Symbol.toStringTag, { value: 'Module' }));

if (typeof navigator === "undefined" || navigator.userAgent !== "Cloudflare-Workers") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {
  }
}
function scryptAsync(password, salt, keylen) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}
const MONGODB_URI$1 = process.env.MONGODB_URI || "mongodb+srv://the-usman:Usm123000@cluster0.gqzyjmn.mongodb.net/";
const DB_NAME = "project_db_client";
const COLLECTION = "users";
const AUTH_COOKIE = "auth_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
function getJwtSecret(env) {
  const secret = env?.JWT_SECRET || process.env.JWT_SECRET || "sitara-builder-jwt-secret-change-in-production";
  return new TextEncoder().encode(secret);
}
async function findUserByEmail(email) {
  const client = new MongoClient(MONGODB_URI$1);
  try {
    await client.connect();
    return await client.db(DB_NAME).collection(COLLECTION).findOne({ email: email.toLowerCase().trim() });
  } finally {
    await client.close();
  }
}
function checkAccess(user) {
  if (!user.active) {
    return { allowed: false, reason: "Your account has been deactivated." };
  }
  if (user.role === "super_admin") {
    return { allowed: true };
  }
  if (user.role === "operator") {
    if (Array.isArray(user.automations) && user.automations.includes("web_builder")) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Access denied. Your account does not have web builder permissions."
    };
  }
  return { allowed: false, reason: "Access denied. Unrecognised role." };
}
async function verifyPassword(password, stored) {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) {
      const { default: bcrypt } = await import('bcryptjs');
      return bcrypt.compare(password, stored);
    }
    return password === stored;
  }
  try {
    const salt = Buffer.from(parts[1], "base64");
    const expected = Buffer.from(parts[2], "base64");
    const derived = await scryptAsync(password, salt, expected.length);
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
async function signJwt(payload, env) {
  const secret = getJwtSecret(env);
  return new SignJWT({ ...payload }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
}
async function verifyJwt(token, env) {
  try {
    const secret = getJwtSecret(env);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}
function getAuthToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
function setAuthCookie(token) {
  return `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`;
}
function clearAuthCookie() {
  return `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
async function requireAuth(request, env) {
  const token = getAuthToken(request);
  if (!token) throw redirect("/login");
  const user = await verifyJwt(token, env);
  if (!user) throw redirect("/login");
  return user;
}

async function action$d({ request, context }) {
  await requireAuth(request, context.cloudflare?.env);
  const { chatId, field, url } = await request.json();
  if (!chatId || !field || !url) {
    return json({ error: "chatId, field, and url are required" }, { status: 400 });
  }
  await updateProjectUrl(chatId, field, url);
  return json({ success: true });
}

const route19 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$d
}, Symbol.toStringTag, { value: 'Module' }));

const VALID_CATEGORIES = [
  "architecture",
  "characters-creatures",
  "furniture-home",
  "vehicles-transportation",
  "nature-plants",
  "science-technology",
  "food-drink",
  "fashion-style",
  "art-abstract"
];
async function action$c({ context, request }) {
  const { messages, model, provider } = await request.json();
  const cookieHeader = request.headers.get("Cookie");
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);
  const chatText = messages.filter((m) => m.role === "user").map((m) => {
    const content = Array.isArray(m.content) ? m.content.find((c) => c.type === "text")?.text ?? "" : m.content;
    return content.replace(/^\[Model:.*?\]\n\n\[Provider:.*?\]\n\n/s, "").trim();
  }).filter(Boolean).slice(0, 6).join("\n---\n");
  try {
    const result = await streamText({
      messages: [
        {
          role: "user",
          content: `[Model: ${model}]

[Provider: ${provider.name}]

Based on this website-building conversation, decide the single most relevant 3D model to embed in the website. Output ONLY valid JSON with exactly these two keys:
- "query": a specific 2-5 word search term for Sketchfab (e.g. "modern office chair", "oak tree", "sports car", "space rocket")
- "category": one of [${VALID_CATEGORIES.join(", ")}] or "" if none fits

Conversation:
${chatText}

Reply with ONLY valid JSON, no extra text. Example: {"query":"modern dining chair","category":"furniture-home"}`
        }
      ],
      env: context.cloudflare?.env,
      apiKeys,
      providerSettings
    });
    const raw = (await result.text).trim();
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const query = String(parsed.query || "architecture model").trim();
    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "";
    return new Response(JSON.stringify({ query, category }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (_e) {
    return new Response(JSON.stringify({ query: "architecture model", category: "" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

const route20 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$c
}, Symbol.toStringTag, { value: 'Module' }));

const logger$b = createScopedLogger("api.supabase.query");
async function action$b({ request }) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return new Response("No authorization token provided", { status: 401 });
  }
  try {
    const { projectId, query } = await request.json();
    logger$b.debug("Executing query:", { projectId, query });
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.log(e);
        errorData = { message: errorText };
      }
      logger$b.error(
        "Supabase API error:",
        JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
      );
      return new Response(
        JSON.stringify({
          error: {
            status: response.status,
            statusText: response.statusText,
            message: errorData.message || errorData.error || errorText,
            details: errorData
          }
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    const result = await response.json();
    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    logger$b.error("Query execution error:", error);
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : "Query execution failed",
          stack: error instanceof Error ? error.stack : void 0
        }
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

const route21 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$b
}, Symbol.toStringTag, { value: 'Module' }));

const loader$d = async ({ context, request }) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  if (!provider) {
    return Response.json({ isSet: false });
  }
  const llmManager = LLMManager.getInstance(context?.cloudflare?.env);
  const providerInstance = llmManager.getProvider(provider);
  if (!providerInstance || !providerInstance.config.apiTokenKey) {
    return Response.json({ isSet: false });
  }
  const envVarName = providerInstance.config.apiTokenKey;
  const cookieHeader = request.headers.get("Cookie");
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const isSet = !!(apiKeys?.[provider] || context?.cloudflare?.env?.[envVarName] || process.env[envVarName] || llmManager.env[envVarName]);
  return Response.json({ isSet });
};

const route22 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$d
}, Symbol.toStringTag, { value: 'Module' }));

async function loader$c({ request }) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const token = url.searchParams.get("token");
  if (!projectId || !token) {
    return json({ error: "Missing projectId or token" }, { status: 400 });
  }
  try {
    const projectResponse = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!projectResponse.ok) {
      return json({ error: "Failed to fetch project" }, { status: 400 });
    }
    const projectData = await projectResponse.json();
    const deploymentsResponse = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!deploymentsResponse.ok) {
      return json({ error: "Failed to fetch deployments" }, { status: 400 });
    }
    const deploymentsData = await deploymentsResponse.json();
    const latestDeployment = deploymentsData.deployments?.[0];
    return json({
      project: {
        id: projectData.id,
        name: projectData.name,
        url: `https://${projectData.name}.vercel.app`
      },
      deploy: latestDeployment ? {
        id: latestDeployment.id,
        state: latestDeployment.state,
        url: latestDeployment.url ? `https://${latestDeployment.url}` : `https://${projectData.name}.vercel.app`
      } : null
    });
  } catch (error) {
    console.error("Error fetching Vercel deployment:", error);
    return json({ error: "Failed to fetch deployment" }, { status: 500 });
  }
}
async function action$a({ request }) {
  try {
    const { projectId, files, token, chatId } = await request.json();
    if (!token) {
      return json({ error: "Not connected to Vercel" }, { status: 401 });
    }
    let targetProjectId = projectId;
    let projectInfo;
    if (!targetProjectId) {
      const projectName = `sitara-builder-${chatId}-${Date.now()}`;
      const createProjectResponse = await fetch("https://api.vercel.com/v9/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: projectName,
          framework: null
        })
      });
      if (!createProjectResponse.ok) {
        const errorData = await createProjectResponse.json();
        return json(
          { error: `Failed to create project: ${errorData.error?.message || "Unknown error"}` },
          { status: 400 }
        );
      }
      const newProject = await createProjectResponse.json();
      targetProjectId = newProject.id;
      projectInfo = {
        id: newProject.id,
        name: newProject.name,
        url: `https://${newProject.name}.vercel.app`,
        chatId
      };
    } else {
      const projectResponse = await fetch(`https://api.vercel.com/v9/projects/${targetProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (projectResponse.ok) {
        const existingProject = await projectResponse.json();
        projectInfo = {
          id: existingProject.id,
          name: existingProject.name,
          url: `https://${existingProject.name}.vercel.app`,
          chatId
        };
      } else {
        const projectName = `sitara-builder-${chatId}-${Date.now()}`;
        const createProjectResponse = await fetch("https://api.vercel.com/v9/projects", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: projectName,
            framework: null
          })
        });
        if (!createProjectResponse.ok) {
          const errorData = await createProjectResponse.json();
          return json(
            { error: `Failed to create project: ${errorData.error?.message || "Unknown error"}` },
            { status: 400 }
          );
        }
        const newProject = await createProjectResponse.json();
        targetProjectId = newProject.id;
        projectInfo = {
          id: newProject.id,
          name: newProject.name,
          url: `https://${newProject.name}.vercel.app`,
          chatId
        };
      }
    }
    const deploymentFiles = [];
    for (const [filePath, content] of Object.entries(files)) {
      const normalizedPath = filePath.startsWith("/") ? filePath.substring(1) : filePath;
      deploymentFiles.push({
        file: normalizedPath,
        data: content
      });
    }
    const deployResponse = await fetch(`https://api.vercel.com/v13/deployments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: projectInfo.name,
        project: targetProjectId,
        target: "production",
        files: deploymentFiles,
        routes: [{ src: "/(.*)", dest: "/$1" }]
      })
    });
    if (!deployResponse.ok) {
      const errorData = await deployResponse.json();
      return json(
        { error: `Failed to create deployment: ${errorData.error?.message || "Unknown error"}` },
        { status: 400 }
      );
    }
    const deployData = await deployResponse.json();
    let retryCount = 0;
    const maxRetries = 60;
    let deploymentUrl = "";
    let deploymentState = "";
    while (retryCount < maxRetries) {
      const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${deployData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        deploymentState = status.readyState;
        deploymentUrl = status.url ? `https://${status.url}` : "";
        if (status.readyState === "READY" || status.readyState === "ERROR") {
          break;
        }
      }
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 2e3));
    }
    if (deploymentState === "ERROR") {
      return json({ error: "Deployment failed" }, { status: 500 });
    }
    if (retryCount >= maxRetries) {
      return json({ error: "Deployment timed out" }, { status: 500 });
    }
    const finalUrl = projectInfo.url || deploymentUrl;
    if (chatId && finalUrl) {
      updateProjectUrl(chatId, "vercelUrl", finalUrl).catch(console.error);
    }
    return json({
      success: true,
      deploy: {
        id: deployData.id,
        state: deploymentState,
        url: finalUrl
      },
      project: projectInfo
    });
  } catch (error) {
    console.error("Vercel deploy error:", error);
    return json({ error: "Deployment failed" }, { status: 500 });
  }
}

const route23 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$a,
  loader: loader$c
}, Symbol.toStringTag, { value: 'Module' }));

async function loader$b(_) {
  throw redirect("/login", { headers: { "Set-Cookie": clearAuthCookie() } });
}
async function action$9(_) {
  throw redirect("/login", { headers: { "Set-Cookie": clearAuthCookie() } });
}

const route24 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$9,
  loader: loader$b
}, Symbol.toStringTag, { value: 'Module' }));

const ALLOW_HEADERS = [
  "accept-encoding",
  "accept-language",
  "accept",
  "access-control-allow-origin",
  "authorization",
  "cache-control",
  "connection",
  "content-length",
  "content-type",
  "dnt",
  "pragma",
  "range",
  "referer",
  "user-agent",
  "x-authorization",
  "x-http-method-override",
  "x-requested-with"
];
const EXPOSE_HEADERS = [
  "accept-ranges",
  "age",
  "cache-control",
  "content-length",
  "content-language",
  "content-type",
  "date",
  "etag",
  "expires",
  "last-modified",
  "pragma",
  "server",
  "transfer-encoding",
  "vary",
  "x-github-request-id",
  "x-redirected-url"
];
async function action$8({ request, params }) {
  return handleProxyRequest(request, params["*"]);
}
async function loader$a({ request, params }) {
  return handleProxyRequest(request, params["*"]);
}
async function handleProxyRequest(request, path) {
  try {
    if (!path) {
      return json({ error: "Invalid proxy URL format" }, { status: 400 });
    }
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": ALLOW_HEADERS.join(", "),
          "Access-Control-Expose-Headers": EXPOSE_HEADERS.join(", "),
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    const parts = path.match(/([^\/]+)\/?(.*)/);
    if (!parts) {
      return json({ error: "Invalid path format" }, { status: 400 });
    }
    const domain = parts[1];
    const remainingPath = parts[2] || "";
    const url = new URL(request.url);
    const targetURL = `https://${domain}/${remainingPath}${url.search}`;
    console.log("Target URL:", targetURL);
    const headers = new Headers();
    for (const header of ALLOW_HEADERS) {
      if (request.headers.has(header)) {
        headers.set(header, request.headers.get(header));
      }
    }
    headers.set("Host", domain);
    if (!headers.has("user-agent") || !headers.get("user-agent")?.startsWith("git/")) {
      headers.set("User-Agent", "git/@isomorphic-git/cors-proxy");
    }
    console.log("Request headers:", Object.fromEntries(headers.entries()));
    const fetchOptions = {
      method: request.method,
      headers,
      redirect: "follow"
    };
    if (!["GET", "HEAD"].includes(request.method)) {
      fetchOptions.body = request.body;
      fetchOptions.duplex = "half";
    }
    const response = await fetch(targetURL, fetchOptions);
    console.log("Response status:", response.status);
    const responseHeaders = new Headers();
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", ALLOW_HEADERS.join(", "));
    responseHeaders.set("Access-Control-Expose-Headers", EXPOSE_HEADERS.join(", "));
    for (const header of EXPOSE_HEADERS) {
      if (header === "content-length") {
        continue;
      }
      if (response.headers.has(header)) {
        responseHeaders.set(header, response.headers.get(header));
      }
    }
    if (response.redirected) {
      responseHeaders.set("x-redirected-url", response.url);
    }
    console.log("Response headers:", Object.fromEntries(responseHeaders.entries()));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return json(
      {
        error: "Proxy error",
        message: error instanceof Error ? error.message : "Unknown error",
        url: path ? `https://${path}` : "Invalid URL"
      },
      { status: 500 }
    );
  }
}

const route25 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$8,
  loader: loader$a
}, Symbol.toStringTag, { value: 'Module' }));

async function action$7({ context, request }) {
  const { imageData, model, provider } = await request.json();
  const cookieHeader = request.headers.get("Cookie");
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);
  try {
    const result = await streamText({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `[Model: ${model}]

[Provider: ${provider.name}]

Look at this image and suggest a short descriptive filename for it.

Rules:
- lowercase letters and hyphens only
- no file extension
- 2 to 4 words maximum
- describe the main subject or purpose
- suitable for a web project asset

Reply with ONLY the filename slug, nothing else.
Examples: pizza-hero-banner, team-photo, product-showcase`
            },
            {
              type: "image",
              image: `data:image/png;base64,${imageData}`
            }
          ]
        }
      ],
      env: context.cloudflare?.env,
      apiKeys,
      providerSettings
    });
    const raw = await result.text;
    const filename = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "uploaded-image";
    return new Response(JSON.stringify({ filename }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (_err) {
    return new Response(JSON.stringify({ filename: "uploaded-image" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

const route26 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$7
}, Symbol.toStringTag, { value: 'Module' }));

async function action$6(args) {
  return enhancerAction(args);
}
const logger$a = createScopedLogger("api.enhancher");
async function enhancerAction({ context, request }) {
  const { message, model, provider } = await request.json();
  const { name: providerName } = provider;
  if (!model || typeof model !== "string") {
    throw new Response("Invalid or missing model", {
      status: 400,
      statusText: "Bad Request"
    });
  }
  if (!providerName || typeof providerName !== "string") {
    throw new Response("Invalid or missing provider", {
      status: 400,
      statusText: "Bad Request"
    });
  }
  const cookieHeader = request.headers.get("Cookie");
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);
  try {
    const result = await streamText({
      messages: [
        {
          role: "user",
          content: `[Model: ${model}]

[Provider: ${providerName}]

` + stripIndents`
            You are a professional prompt engineer specializing in crafting precise, effective prompts.
            Your task is to enhance prompts by making them more specific, actionable, and effective.

            I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.

            For valid prompts:
            - Make instructions explicit and unambiguous
            - Add relevant context and constraints
            - Remove redundant information
            - Maintain the core intent
            - Ensure the prompt is self-contained
            - Use professional language

            For invalid or unclear prompts:
            - Respond with clear, professional guidance
            - Keep responses concise and actionable
            - Maintain a helpful, constructive tone
            - Focus on what the user should provide
            - Use a standard template for consistency

            IMPORTANT: Your response must ONLY contain the enhanced prompt text.
            Do not include any explanations, metadata, or wrapper tags.

            <original_prompt>
              ${message}
            </original_prompt>
          `
        }
      ],
      env: context.cloudflare?.env,
      apiKeys,
      providerSettings,
      options: {
        system: "You are a senior software principal architect, you should help the user analyse the user query and enrich it with the necessary context and constraints to make it more specific, actionable, and effective. You should also ensure that the prompt is self-contained and uses professional language. Your response should ONLY contain the enhanced prompt text. Do not include any explanations, metadata, or wrapper tags."
        /*
         * onError: (event) => {
         *   throw new Response(null, {
         *     status: 500,
         *     statusText: 'Internal Server Error',
         *   });
         * }
         */
      }
    });
    (async () => {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "error") {
            const error = part.error;
            logger$a.error("Streaming error:", error);
            break;
          }
        }
      } catch (error) {
        logger$a.error("Error processing stream:", error);
      }
    })();
    return new Response(result.textStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    console.log(error);
    if (error instanceof Error && error.message?.includes("API key")) {
      throw new Response("Invalid or missing API key", {
        status: 401,
        statusText: "Unauthorized"
      });
    }
    throw new Response(null, {
      status: 500,
      statusText: "Internal Server Error"
    });
  }
}

const route27 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$6
}, Symbol.toStringTag, { value: 'Module' }));

async function loader$9({ request, context }) {
  const user = await requireAuth(request, context.cloudflare?.env);
  const chats = await getChats(user.userId, user.role);
  return json({ chats });
}

const route28 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$9
}, Symbol.toStringTag, { value: 'Module' }));

const action$5 = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  try {
    const { token } = await request.json();
    const projectsResponse = await fetch("https://api.supabase.com/v1/projects", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    if (!projectsResponse.ok) {
      const errorText = await projectsResponse.text();
      console.error("Projects fetch failed:", errorText);
      return json({ error: "Failed to fetch projects" }, { status: 401 });
    }
    const projects = await projectsResponse.json();
    const uniqueProjectsMap = /* @__PURE__ */ new Map();
    for (const project of projects) {
      if (!uniqueProjectsMap.has(project.id)) {
        uniqueProjectsMap.set(project.id, project);
      }
    }
    const uniqueProjects = Array.from(uniqueProjectsMap.values());
    uniqueProjects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return json({
      user: { email: "Connected", role: "Admin" },
      stats: {
        projects: uniqueProjects,
        totalProjects: uniqueProjects.length
      }
    });
  } catch (error) {
    console.error("Supabase API error:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Authentication failed"
      },
      { status: 401 }
    );
  }
};

const route29 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$5
}, Symbol.toStringTag, { value: 'Module' }));

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://the-usman:Usm123000@cluster0.gqzyjmn.mongodb.net/";
async function loader$8({ request, context }) {
  await requireAuth(request, context.cloudflare?.env);
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const docs = await client.db("project_db_client").collection("clients").find({}, { projection: { _id: 1, clientName: 1, productName: 1 } }).sort({ clientName: 1 }).toArray();
    return json({
      clients: docs.map((d) => ({
        _id: d._id.toString(),
        clientName: d.clientName,
        productName: d.productName
      }))
    });
  } finally {
    await client.close();
  }
}

const route30 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$8
}, Symbol.toStringTag, { value: 'Module' }));

const __vite_import_meta_env__ = {"BASE_URL": "/", "DEV": false, "LMSTUDIO_API_BASE_URL": "", "MODE": "production", "OLLAMA_API_BASE_URL": "", "OPENAI_LIKE_API_BASE_URL": "", "PROD": true, "SSR": true, "TOGETHER_API_BASE_URL": "", "VITE_GITHUB_ACCESS_TOKEN": "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", "VITE_GITHUB_TOKEN_TYPE": "classic", "VITE_LOG_LEVEL": "", "VITE_NETLIFY_ACCESS_TOKEN": "nfp_Ct8Ptp7CmiZfB3Xv4JBtt6atyUVSCd9j3f25", "VITE_VERCEL_ACCESS_TOKEN": "vcp_3VlTOglFCKZkhLZ9UAGoeAR1RaeN4fbzLdnf5NA9CYP1F7wlyz2ZnYqX"};
async function action$4(args) {
  return llmCallAction(args);
}
async function getModelList(options) {
  const llmManager = LLMManager.getInstance(__vite_import_meta_env__);
  return llmManager.updateModelList(options);
}
const logger$9 = createScopedLogger("api.llmcall");
async function llmCallAction({ context, request }) {
  const { system, message, model, provider, streamOutput } = await request.json();
  const { name: providerName } = provider;
  if (!model || typeof model !== "string") {
    throw new Response("Invalid or missing model", {
      status: 400,
      statusText: "Bad Request"
    });
  }
  if (!providerName || typeof providerName !== "string") {
    throw new Response("Invalid or missing provider", {
      status: 400,
      statusText: "Bad Request"
    });
  }
  const cookieHeader = request.headers.get("Cookie");
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);
  if (streamOutput) {
    try {
      const result = await streamText({
        options: {
          system
        },
        messages: [
          {
            role: "user",
            content: `${message}`
          }
        ],
        env: context.cloudflare?.env,
        apiKeys,
        providerSettings
      });
      return new Response(result.textStream, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      });
    } catch (error) {
      console.log(error);
      if (error instanceof Error && error.message?.includes("API key")) {
        throw new Response("Invalid or missing API key", {
          status: 401,
          statusText: "Unauthorized"
        });
      }
      throw new Response(null, {
        status: 500,
        statusText: "Internal Server Error"
      });
    }
  } else {
    try {
      const models = await getModelList({ apiKeys, providerSettings, serverEnv: context.cloudflare?.env });
      const modelDetails = models.find((m) => m.name === model);
      if (!modelDetails) {
        throw new Error("Model not found");
      }
      const dynamicMaxTokens = modelDetails && modelDetails.maxTokenAllowed ? modelDetails.maxTokenAllowed : MAX_TOKENS;
      const providerInfo = PROVIDER_LIST.find((p) => p.name === provider.name);
      if (!providerInfo) {
        throw new Error("Provider not found");
      }
      logger$9.info(`Generating response Provider: ${provider.name}, Model: ${modelDetails.name}`);
      const result = await generateText({
        system,
        messages: [
          {
            role: "user",
            content: `${message}`
          }
        ],
        model: providerInfo.getModelInstance({
          model: modelDetails.name,
          serverEnv: context.cloudflare?.env,
          apiKeys,
          providerSettings
        }),
        maxTokens: dynamicMaxTokens,
        toolChoice: "none"
      });
      logger$9.info(`Generated response`);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (error) {
      console.log(error);
      if (error instanceof Error && error.message?.includes("API key")) {
        throw new Response("Invalid or missing API key", {
          status: 401,
          statusText: "Unauthorized"
        });
      }
      throw new Response(null, {
        status: 500,
        statusText: "Internal Server Error"
      });
    }
  }
}

const route31 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$4
}, Symbol.toStringTag, { value: 'Module' }));

const loader$7 = async ({ request: _request }) => {
  return json({
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
};

const route32 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  loader: loader$7
}, Symbol.toStringTag, { value: 'Module' }));

async function loader$6({ request, context }) {
  await requireAuth(request, context.cloudflare?.env);
  return json({ skills: await listCustomSkills() });
}
async function action$3({ request, context }) {
  const user = await requireAuth(request, context.cloudflare?.env);
  if (user.role !== "super_admin") {
    return json({ error: "Only a super admin can manage skills." }, { status: 403 });
  }
  const body = await request.json();
  const createdBy = { userId: user.userId, email: user.email };
  const importOptions = { triggers: body.triggers, alwaysLoad: body.alwaysLoad };
  try {
    switch (body.intent) {
      case "add-git": {
        if (!body.url) {
          return json({ error: "url is required" }, { status: 400 });
        }
        const parsed = await importSkillFromGit(body.url);
        const skill = await saveCustomSkill(parsed, { type: "git", ref: body.url }, createdBy, importOptions);
        return json({ success: true, skill: { name: skill.name, description: skill.description } });
      }
      case "add-md": {
        if (!body.content) {
          return json({ error: "content is required" }, { status: 400 });
        }
        const parsed = parseSkillMd(body.content, body.filename);
        const skill = await saveCustomSkill(parsed, { type: "md", ref: body.filename }, createdBy, importOptions);
        return json({ success: true, skill: { name: skill.name, description: skill.description } });
      }
      case "add-zip": {
        if (!body.dataBase64) {
          return json({ error: "dataBase64 is required" }, { status: 400 });
        }
        const parsed = await importSkillFromZip(body.dataBase64, body.filename);
        const skill = await saveCustomSkill(parsed, { type: "zip", ref: body.filename }, createdBy, importOptions);
        return json({ success: true, skill: { name: skill.name, description: skill.description } });
      }
      case "toggle": {
        if (!body.name || typeof body.enabled !== "boolean") {
          return json({ error: "name and enabled are required" }, { status: 400 });
        }
        await setCustomSkillEnabled(body.name, body.enabled);
        return json({ success: true });
      }
      case "toggle-builtin": {
        if (!body.name || typeof body.enabled !== "boolean") {
          return json({ error: "name and enabled are required" }, { status: 400 });
        }
        if (!promptSkills.some((s) => s.name === body.name)) {
          return json({ error: `Unknown built-in skill: ${body.name}` }, { status: 400 });
        }
        await setBuiltinSkillEnabled(body.name, body.enabled);
        return json({ success: true });
      }
      case "delete": {
        if (!body.name) {
          return json({ error: "name is required" }, { status: 400 });
        }
        await deleteCustomSkill(body.name);
        return json({ success: true });
      }
      default:
        return json({ error: "Unknown intent" }, { status: 400 });
    }
  } catch (error) {
    return json({ error: error?.message || "Skill import failed" }, { status: 422 });
  }
}

const route34 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$3,
  loader: loader$6
}, Symbol.toStringTag, { value: 'Module' }));

const action$2 = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  return json(
    {
      error: "Updates must be performed manually in a server environment",
      instructions: [
        "1. Navigate to the project directory",
        "2. Run: git fetch upstream",
        "3. Run: git pull upstream main",
        "4. Run: pnpm install",
        "5. Run: pnpm run build"
      ]
    },
    { status: 400 }
  );
};

const route35 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$2
}, Symbol.toStringTag, { value: 'Module' }));

class SwitchableStream extends TransformStream {
  _controller = null;
  _currentReader = null;
  _switches = 0;
  constructor() {
    let controllerRef;
    super({
      start(controller) {
        controllerRef = controller;
      }
    });
    if (controllerRef === void 0) {
      throw new Error("Controller not properly initialized");
    }
    this._controller = controllerRef;
  }
  async switchSource(newStream) {
    if (this._currentReader) {
      await this._currentReader.cancel();
    }
    this._currentReader = newStream.getReader();
    this._pumpStream();
    this._switches++;
  }
  async _pumpStream() {
    if (!this._currentReader || !this._controller) {
      throw new Error("Stream is not properly initialized");
    }
    try {
      while (true) {
        const { done, value } = await this._currentReader.read();
        if (done) {
          break;
        }
        this._controller.enqueue(value);
      }
    } catch (error) {
      console.log(error);
      this._controller.error(error);
    }
  }
  close() {
    if (this._currentReader) {
      this._currentReader.cancel();
    }
    this._controller?.terminate();
  }
  get switches() {
    return this._switches;
  }
}

const ig$2 = ignore().add(IGNORE_PATTERNS$2);
const logger$8 = createScopedLogger("select-context");
async function selectContext(props) {
  const { messages, env: serverEnv, apiKeys, files, providerSettings, summary, onFinish } = props;
  let currentModel = DEFAULT_MODEL;
  let currentProvider = DEFAULT_PROVIDER.name;
  const processedMessages = messages.map((message) => {
    if (message.role === "user") {
      const { model, provider: provider2, content } = extractPropertiesFromMessage(message);
      currentModel = model;
      currentProvider = provider2;
      return { ...message, content };
    } else if (message.role == "assistant") {
      let content = message.content;
      content = simplifyBoltActions(content);
      content = content.replace(/<div class=\\"__boltThought__\\">.*?<\/div>/s, "");
      content = content.replace(/<think>.*?<\/think>/s, "");
      return { ...message, content };
    }
    return message;
  });
  const provider = PROVIDER_LIST.find((p) => p.name === currentProvider) || DEFAULT_PROVIDER;
  const staticModels = LLMManager.getInstance().getStaticModelListFromProvider(provider);
  let modelDetails = staticModels.find((m) => m.name === currentModel);
  if (!modelDetails) {
    const modelsList = [
      ...provider.staticModels || [],
      ...await LLMManager.getInstance().getModelListFromProvider(provider, {
        apiKeys,
        providerSettings,
        serverEnv
      })
    ];
    if (!modelsList.length) {
      throw new Error(`No models found for provider ${provider.name}`);
    }
    modelDetails = modelsList.find((m) => m.name === currentModel);
    if (!modelDetails) {
      logger$8.warn(
        `MODEL [${currentModel}] not found in provider [${provider.name}]. Falling back to first model. ${modelsList[0].name}`
      );
      modelDetails = modelsList[0];
    }
  }
  const { codeContext } = extractCurrentContext(processedMessages);
  let filePaths = getFilePaths(files || {});
  filePaths = filePaths.filter((x) => {
    const relPath = x.replace("/home/project/", "");
    return !ig$2.ignores(relPath);
  });
  let context = "";
  const currrentFiles = [];
  const contextFiles = {};
  if (codeContext?.type === "codeContext") {
    const codeContextFiles = codeContext.files;
    Object.keys(files || {}).forEach((path) => {
      let relativePath = path;
      if (path.startsWith("/home/project/")) {
        relativePath = path.replace("/home/project/", "");
      }
      if (codeContextFiles.includes(relativePath)) {
        contextFiles[relativePath] = files[path];
        currrentFiles.push(relativePath);
      }
    });
    context = createFilesContext(contextFiles);
  }
  const summaryText = `Here is the summary of the chat till now: ${summary}`;
  const extractTextContent = (message) => Array.isArray(message.content) ? message.content.find((item) => item.type === "text")?.text || "" : message.content;
  const lastUserMessage = processedMessages.filter((x) => x.role == "user").pop();
  if (!lastUserMessage) {
    throw new Error("No user message found");
  }
  const resp = await generateText({
    system: `
        You are a software engineer. You are working on a project. You have access to the following files:

        AVAILABLE FILES PATHS
        ---
        ${filePaths.map((path) => `- ${path}`).join("\n")}
        ---

        You have following code loaded in the context buffer that you can refer to:

        CURRENT CONTEXT BUFFER
        ---
        ${context}
        ---

        Now, you are given a task. You need to select the files that are relevant to the task from the list of files above.

        RESPONSE FORMAT:
        your response should be in following format:
---
<updateContextBuffer>
    <includeFile path="path/to/file"/>
    <excludeFile path="path/to/file"/>
</updateContextBuffer>
---
        * Your should start with <updateContextBuffer> and end with </updateContextBuffer>.
        * You can include multiple <includeFile> and <excludeFile> tags in the response.
        * You should not include any other text in the response.
        * You should not include any file that is not in the list of files above.
        * You should not include any file that is already in the context buffer.
        * If no changes are needed, you can leave the response empty updateContextBuffer tag.
        `,
    prompt: `
        ${summaryText}

        Users Question: ${extractTextContent(lastUserMessage)}

        update the context buffer with the files that are relevant to the task from the list of files above.

        CRITICAL RULES:
        * Only include relevant files in the context buffer.
        * context buffer should not include any file that is not in the list of files above.
        * context buffer is extremlly expensive, so only include files that are absolutely necessary.
        * If no changes are needed, you can leave the response empty updateContextBuffer tag.
        * Only 5 files can be placed in the context buffer at a time.
        * if the buffer is full, you need to exclude files that is not needed and include files that is relevent.

        `,
    model: provider.getModelInstance({
      model: currentModel,
      serverEnv,
      apiKeys,
      providerSettings
    })
  });
  const response = resp.text;
  const updateContextBuffer = response.match(/<updateContextBuffer>([\s\S]*?)<\/updateContextBuffer>/);
  if (!updateContextBuffer) {
    throw new Error("Invalid response. Please follow the response format");
  }
  const includeFiles = updateContextBuffer[1].match(/<includeFile path="(.*?)"/gm)?.map((x) => x.replace('<includeFile path="', "").replace('"', "")) || [];
  const excludeFiles = updateContextBuffer[1].match(/<excludeFile path="(.*?)"/gm)?.map((x) => x.replace('<excludeFile path="', "").replace('"', "")) || [];
  const filteredFiles = {};
  excludeFiles.forEach((path) => {
    delete contextFiles[path];
  });
  includeFiles.forEach((path) => {
    let fullPath = path;
    if (!path.startsWith("/home/project/")) {
      fullPath = `/home/project/${path}`;
    }
    if (!filePaths.includes(fullPath)) {
      logger$8.error(`File ${path} is not in the list of files above.`);
      return;
    }
    if (currrentFiles.includes(path)) {
      return;
    }
    filteredFiles[path] = files[fullPath];
  });
  if (onFinish) {
    onFinish(resp);
  }
  const totalFiles = Object.keys(filteredFiles).length;
  logger$8.info(`Total files: ${totalFiles}`);
  if (totalFiles == 0) {
    throw new Error(`Bolt failed to select files`);
  }
  return filteredFiles;
}
function getFilePaths(files) {
  let filePaths = Object.keys(files);
  filePaths = filePaths.filter((x) => {
    const relPath = x.replace("/home/project/", "");
    return !ig$2.ignores(relPath);
  });
  return filePaths;
}

const logger$7 = createScopedLogger("create-summary");
async function createSummary(props) {
  const { messages, env: serverEnv, apiKeys, providerSettings, onFinish } = props;
  let currentModel = DEFAULT_MODEL;
  let currentProvider = DEFAULT_PROVIDER.name;
  const processedMessages = messages.map((message) => {
    if (message.role === "user") {
      const { model, provider: provider2, content } = extractPropertiesFromMessage(message);
      currentModel = model;
      currentProvider = provider2;
      return { ...message, content };
    } else if (message.role == "assistant") {
      let content = message.content;
      content = simplifyBoltActions(content);
      content = content.replace(/<div class=\\"__boltThought__\\">.*?<\/div>/s, "");
      content = content.replace(/<think>.*?<\/think>/s, "");
      return { ...message, content };
    }
    return message;
  });
  const provider = PROVIDER_LIST.find((p) => p.name === currentProvider) || DEFAULT_PROVIDER;
  const staticModels = LLMManager.getInstance().getStaticModelListFromProvider(provider);
  let modelDetails = staticModels.find((m) => m.name === currentModel);
  if (!modelDetails) {
    const modelsList = [
      ...provider.staticModels || [],
      ...await LLMManager.getInstance().getModelListFromProvider(provider, {
        apiKeys,
        providerSettings,
        serverEnv
      })
    ];
    if (!modelsList.length) {
      throw new Error(`No models found for provider ${provider.name}`);
    }
    modelDetails = modelsList.find((m) => m.name === currentModel);
    if (!modelDetails) {
      logger$7.warn(
        `MODEL [${currentModel}] not found in provider [${provider.name}]. Falling back to first model. ${modelsList[0].name}`
      );
      modelDetails = modelsList[0];
    }
  }
  let slicedMessages = processedMessages;
  const { summary } = extractCurrentContext(processedMessages);
  let summaryText = void 0;
  let chatId = void 0;
  if (summary && summary.type === "chatSummary") {
    chatId = summary.chatId;
    summaryText = `Below is the Chat Summary till now, this is chat summary before the conversation provided by the user 
you should also use this as historical message while providing the response to the user.        
${summary.summary}`;
    if (chatId) {
      let index = 0;
      for (let i = 0; i < processedMessages.length; i++) {
        if (processedMessages[i].id === chatId) {
          index = i;
          break;
        }
      }
      slicedMessages = processedMessages.slice(index + 1);
    }
  }
  logger$7.debug("Sliced Messages:", slicedMessages.length);
  const extractTextContent = (message) => Array.isArray(message.content) ? message.content.find((item) => item.type === "text")?.text || "" : message.content;
  const resp = await generateText({
    system: `
        You are a software engineer. You are working on a project. you need to summarize the work till now and provide a summary of the chat till now.

        Please only use the following format to generate the summary:
---
# Project Overview
- **Project**: {project_name} - {brief_description}
- **Current Phase**: {phase}
- **Tech Stack**: {languages}, {frameworks}, {key_dependencies}
- **Environment**: {critical_env_details}

# Conversation Context
- **Last Topic**: {main_discussion_point}
- **Key Decisions**: {important_decisions_made}
- **User Context**:
  - Technical Level: {expertise_level}
  - Preferences: {coding_style_preferences}
  - Communication: {preferred_explanation_style}

# Implementation Status
## Current State
- **Active Feature**: {feature_in_development}
- **Progress**: {what_works_and_what_doesn't}
- **Blockers**: {current_challenges}

## Code Evolution
- **Recent Changes**: {latest_modifications}
- **Working Patterns**: {successful_approaches}
- **Failed Approaches**: {attempted_solutions_that_failed}

# Requirements
- **Implemented**: {completed_features}
- **In Progress**: {current_focus}
- **Pending**: {upcoming_features}
- **Technical Constraints**: {critical_constraints}

# Critical Memory
- **Must Preserve**: {crucial_technical_context}
- **User Requirements**: {specific_user_needs}
- **Known Issues**: {documented_problems}

# Next Actions
- **Immediate**: {next_steps}
- **Open Questions**: {unresolved_issues}

---
Note:
4. Keep entries concise and focused on information needed for continuity


---
        
        RULES:
        * Only provide the whole summary of the chat till now.
        * Do not provide any new information.
        * DO not need to think too much just start writing imidiately
        * do not write any thing other that the summary with with the provided structure
        `,
    prompt: `

Here is the previous summary of the chat:
<old_summary>
${summaryText} 
</old_summary>

Below is the chat after that:
---
<new_chats>
${slicedMessages.map((x) => {
      return `---
[${x.role}] ${extractTextContent(x)}
---`;
    }).join("\n")}
</new_chats>
---

Please provide a summary of the chat till now including the hitorical summary of the chat.
`,
    model: provider.getModelInstance({
      model: currentModel,
      serverEnv,
      apiKeys,
      providerSettings
    })
  });
  const response = resp.text;
  if (onFinish) {
    onFinish(resp);
  }
  return response;
}

const ANTHROPIC = [
  { prefix: "claude-fable-5", rate: { input: 10, output: 50 } },
  { prefix: "claude-mythos-5", rate: { input: 10, output: 50 } },
  { prefix: "claude-opus-4", rate: { input: 5, output: 25 } },
  // 4.5–4.8
  { prefix: "claude-opus-3", rate: { input: 15, output: 75 } },
  { prefix: "claude-opus", rate: { input: 5, output: 25 } },
  { prefix: "claude-sonnet-4", rate: { input: 3, output: 15 } },
  // 4.5/4.6
  { prefix: "claude-haiku-4", rate: { input: 1, output: 5 } },
  { prefix: "claude-sonnet", rate: { input: 3, output: 15 } },
  { prefix: "claude-haiku", rate: { input: 1, output: 5 } },
  // Legacy Claude 3.x ids (model name carries the family)
  { prefix: "claude-3-5-sonnet", rate: { input: 3, output: 15 } },
  { prefix: "claude-3-7-sonnet", rate: { input: 3, output: 15 } },
  { prefix: "claude-3-5-haiku", rate: { input: 0.8, output: 4 } },
  { prefix: "claude-3-opus", rate: { input: 15, output: 75 } },
  { prefix: "claude-3-haiku", rate: { input: 0.25, output: 1.25 } }
];
const OPENAI = [
  { prefix: "gpt-4o-mini", rate: { input: 0.15, output: 0.6 } },
  { prefix: "gpt-4o", rate: { input: 2.5, output: 10 } },
  { prefix: "gpt-4.1-mini", rate: { input: 0.4, output: 1.6 } },
  { prefix: "gpt-4.1-nano", rate: { input: 0.1, output: 0.4 } },
  { prefix: "gpt-4.1", rate: { input: 2, output: 8 } },
  { prefix: "gpt-4-turbo", rate: { input: 10, output: 30 } },
  { prefix: "gpt-4", rate: { input: 30, output: 60 } },
  { prefix: "gpt-3.5-turbo", rate: { input: 0.5, output: 1.5 } },
  { prefix: "o1-mini", rate: { input: 1.1, output: 4.4 } },
  { prefix: "o1", rate: { input: 15, output: 60 } },
  { prefix: "o3-mini", rate: { input: 1.1, output: 4.4 } },
  { prefix: "o3", rate: { input: 2, output: 8 } },
  { prefix: "chatgpt-4o", rate: { input: 5, output: 15 } }
];
const GOOGLE = [
  { prefix: "gemini-1.5-flash-8b", rate: { input: 0.0375, output: 0.15 } },
  { prefix: "gemini-1.5-flash", rate: { input: 0.075, output: 0.3 } },
  { prefix: "gemini-1.5-pro", rate: { input: 1.25, output: 5 } },
  { prefix: "gemini-2.0-flash", rate: { input: 0.1, output: 0.4 } },
  { prefix: "gemini-2.5-pro", rate: { input: 1.25, output: 10 } },
  { prefix: "gemini-2.5-flash", rate: { input: 0.3, output: 2.5 } }
];
const DEEPSEEK = [
  { prefix: "deepseek-reasoner", rate: { input: 0.55, output: 2.19 } },
  { prefix: "deepseek-chat", rate: { input: 0.27, output: 1.1 } },
  { prefix: "deepseek-coder", rate: { input: 0.27, output: 1.1 } }
];
const XAI = [
  { prefix: "grok-3", rate: { input: 3, output: 15 } },
  { prefix: "grok-2", rate: { input: 2, output: 10 } },
  { prefix: "grok-beta", rate: { input: 5, output: 15 } }
];
const MISTRAL = [
  { prefix: "mistral-large", rate: { input: 2, output: 6 } },
  { prefix: "mistral-small", rate: { input: 0.2, output: 0.6 } },
  { prefix: "codestral", rate: { input: 0.3, output: 0.9 } }
];
const BY_PROVIDER = {
  anthropic: ANTHROPIC,
  openai: OPENAI,
  google: GOOGLE,
  deepseek: DEEPSEEK,
  xai: XAI,
  mistral: MISTRAL
};
const GLOBAL = [...ANTHROPIC, ...OPENAI, ...GOOGLE, ...DEEPSEEK, ...XAI, ...MISTRAL];
const DEFAULT_RATE = { input: 1, output: 3 };
function longestPrefixMatch(table, id) {
  let best;
  for (const entry of table) {
    if (id.startsWith(entry.prefix) && (!best || entry.prefix.length > best.prefix.length)) {
      best = entry;
    }
  }
  return best?.rate;
}
function getModelRate(provider, model) {
  const id = (model || "").toLowerCase();
  const providerKey = (provider || "").toLowerCase();
  const table = BY_PROVIDER[providerKey];
  const fromProvider = table && longestPrefixMatch(table, id);
  return fromProvider ?? longestPrefixMatch(GLOBAL, id) ?? DEFAULT_RATE;
}
function computeCost(provider, model, promptTokens, completionTokens, rateOverride) {
  const rate = rateOverride ?? getModelRate(provider, model);
  const promptCost = promptTokens / 1e6 * rate.input;
  const completionCost = completionTokens / 1e6 * rate.output;
  return {
    promptCost,
    completionCost,
    totalCost: promptCost + completionCost
  };
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1e3;
const cache = /* @__PURE__ */ new Map();
function fresh(providerKey) {
  const hit = cache.get(providerKey);
  return hit && Date.now() - hit.loadedAt < CACHE_TTL_MS ? hit.rates : void 0;
}
async function loadOpenRouter() {
  const map = /* @__PURE__ */ new Map();
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { "Content-Type": "application/json" }
  });
  const json = await res.json();
  for (const m of json.data ?? []) {
    const input = Number(m.pricing?.prompt) * 1e6;
    const output = Number(m.pricing?.completion) * 1e6;
    if (Number.isFinite(input) && Number.isFinite(output)) {
      map.set(m.id.toLowerCase(), { input, output });
    }
  }
  return map;
}
async function loadTogether(serverEnv, apiKeys) {
  const map = /* @__PURE__ */ new Map();
  const apiKey = apiKeys?.Together || serverEnv?.TOGETHER_API_KEY;
  const baseUrl = serverEnv?.TOGETHER_API_BASE_URL || "https://api.together.xyz/v1";
  if (!apiKey) {
    return map;
  }
  const res = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const json = await res.json();
  for (const m of json ?? []) {
    const input = Number(m.pricing?.input);
    const output = Number(m.pricing?.output);
    if (Number.isFinite(input) && Number.isFinite(output)) {
      map.set(m.id.toLowerCase(), { input, output });
    }
  }
  return map;
}
async function getLiveModelRate(provider, model, serverEnv = {}, apiKeys = {}) {
  const providerKey = (provider || "").toLowerCase();
  if (providerKey !== "openrouter" && providerKey !== "together") {
    return void 0;
  }
  try {
    let rates = fresh(providerKey);
    if (!rates) {
      rates = providerKey === "openrouter" ? await loadOpenRouter() : await loadTogether(serverEnv, apiKeys);
      if (rates.size > 0) {
        cache.set(providerKey, { rates, loadedAt: Date.now() });
      }
    }
    return rates.get((model || "").toLowerCase());
  } catch (error) {
    console.error(`[live-pricing] ${providerKey} lookup failed:`, String(error));
    return void 0;
  }
}

async function action$1(args) {
  return chatAction(args);
}
const logger$6 = createScopedLogger("api.chat");
function parseCookies(cookieHeader) {
  const cookies = {};
  const items = cookieHeader.split(";").map((cookie) => cookie.trim());
  items.forEach((item) => {
    const [name, ...rest] = item.split("=");
    if (name && rest) {
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(rest.join("=").trim());
      cookies[decodedName] = decodedValue;
    }
  });
  return cookies;
}
async function chatAction({ context, request }) {
  const { messages, files, promptId, contextOptimization, supabase, chatId, chatDescription, selectedClient } = await request.json();
  const cookieHeader = request.headers.get("Cookie");
  const apiKeys = JSON.parse(parseCookies(cookieHeader || "").apiKeys || "{}");
  const env = context.cloudflare?.env;
  const authUser = await verifyJwt(getAuthToken(request) || "", env);
  const firstUserMsgId = messages.filter((m) => m.role === "user")[0]?.id;
  const trackingId = firstUserMsgId;
  const providerSettings = JSON.parse(
    parseCookies(cookieHeader || "").providers || "{}"
  );
  const stream = new SwitchableStream();
  const cumulativeUsage = {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0
  };
  let loadedSkills = [];
  const encoder = new TextEncoder();
  let progressCounter = 1;
  try {
    const totalMessageContent = messages.reduce((acc, message) => acc + message.content, "");
    logger$6.debug(`Total message length: ${totalMessageContent.split(" ").length}, words`);
    let lastChunk = void 0;
    const dataStream = createDataStream({
      async execute(dataStream2) {
        const filePaths = getFilePaths(files || {});
        let filteredFiles = void 0;
        let summary = void 0;
        let messageSliceId = 0;
        if (messages.length > 3) {
          messageSliceId = messages.length - 3;
        }
        if (filePaths.length > 0 && contextOptimization) {
          logger$6.debug("Generating Chat Summary");
          dataStream2.writeData({
            type: "progress",
            label: "summary",
            status: "in-progress",
            order: progressCounter++,
            message: "Analysing Request"
          });
          console.log(`Messages count: ${messages.length}`);
          summary = await createSummary({
            messages: [...messages],
            env: context.cloudflare?.env,
            apiKeys,
            providerSettings,
            promptId,
            contextOptimization,
            onFinish(resp) {
              if (resp.usage) {
                logger$6.debug("createSummary token usage", JSON.stringify(resp.usage));
                cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
                cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
                cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
              }
            }
          });
          dataStream2.writeData({
            type: "progress",
            label: "summary",
            status: "complete",
            order: progressCounter++,
            message: "Analysis Complete"
          });
          dataStream2.writeMessageAnnotation({
            type: "chatSummary",
            summary,
            chatId: messages.slice(-1)?.[0]?.id
          });
          logger$6.debug("Updating Context Buffer");
          dataStream2.writeData({
            type: "progress",
            label: "context",
            status: "in-progress",
            order: progressCounter++,
            message: "Determining Files to Read"
          });
          console.log(`Messages count: ${messages.length}`);
          filteredFiles = await selectContext({
            messages: [...messages],
            env: context.cloudflare?.env,
            apiKeys,
            files,
            providerSettings,
            promptId,
            contextOptimization,
            summary,
            onFinish(resp) {
              if (resp.usage) {
                logger$6.debug("selectContext token usage", JSON.stringify(resp.usage));
                cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
                cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
                cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
              }
            }
          });
          if (filteredFiles) {
            logger$6.debug(`files in context : ${JSON.stringify(Object.keys(filteredFiles))}`);
          }
          dataStream2.writeMessageAnnotation({
            type: "codeContext",
            files: Object.keys(filteredFiles).map((key) => {
              let path = key;
              if (path.startsWith(WORK_DIR)) {
                path = path.replace(WORK_DIR, "");
              }
              return path;
            })
          });
          dataStream2.writeData({
            type: "progress",
            label: "context",
            status: "complete",
            order: progressCounter++,
            message: "Code Files Selected"
          });
        }
        const options = {
          supabaseConnection: supabase,
          toolChoice: "none",
          onFinish: async ({ text: content, finishReason, usage }) => {
            logger$6.debug("usage", JSON.stringify(usage));
            if (usage) {
              cumulativeUsage.completionTokens += usage.completionTokens || 0;
              cumulativeUsage.promptTokens += usage.promptTokens || 0;
              cumulativeUsage.totalTokens += usage.totalTokens || 0;
            }
            if (finishReason !== "length") {
              const lastUserMsg = messages.filter((x) => x.role === "user").slice(-1)[0];
              const { model: usageModel, provider: usageProvider } = extractPropertiesFromMessage(lastUserMsg);
              const liveRate = await getLiveModelRate(
                usageProvider,
                usageModel,
                context.cloudflare?.env,
                apiKeys
              );
              const cost = computeCost(
                usageProvider,
                usageModel,
                cumulativeUsage.promptTokens,
                cumulativeUsage.completionTokens,
                liveRate
              );
              dataStream2.writeMessageAnnotation({
                type: "usage",
                value: {
                  completionTokens: cumulativeUsage.completionTokens,
                  promptTokens: cumulativeUsage.promptTokens,
                  totalTokens: cumulativeUsage.totalTokens,
                  promptCost: cost.promptCost,
                  completionCost: cost.completionCost,
                  totalCost: cost.totalCost
                }
              });
              dataStream2.writeMessageAnnotation({ type: "skillsUsed", skills: loadedSkills });
              dataStream2.writeData({
                type: "progress",
                label: "response",
                status: "complete",
                order: progressCounter++,
                message: "Response Generated"
              });
              await new Promise((resolve) => setTimeout(resolve, 0));
              console.log(
                "[chat-tracker] onFinish hit — authUser:",
                authUser?.email,
                "| trackingId:",
                trackingId,
                "| selectedClient:",
                JSON.stringify(selectedClient)
              );
              if (!authUser) {
                console.error("[chat-tracker] SKIP: no authUser");
              } else if (!trackingId) {
                console.error("[chat-tracker] SKIP: no trackingId");
              } else if (!selectedClient) {
                console.error("[chat-tracker] SKIP: selectedClient is null/undefined");
              } else {
                const modelKey = `${usageModel}:${usageProvider}`.replace(/\./g, "_");
                console.log(
                  `[chat-tracker] saving — trackingId: ${trackingId}, client: ${selectedClient.clientName}, model: ${modelKey}, cost: $${cost.totalCost.toFixed(4)}`
                );
                try {
                  await upsertProject(
                    trackingId,
                    chatDescription || trackingId,
                    { userId: authUser.userId, email: authUser.email, name: authUser.name, role: authUser.role },
                    selectedClient,
                    modelKey,
                    {
                      model: usageModel,
                      provider: usageProvider,
                      promptTokens: cumulativeUsage.promptTokens,
                      completionTokens: cumulativeUsage.completionTokens,
                      totalTokens: cumulativeUsage.totalTokens,
                      promptCost: cost.promptCost,
                      completionCost: cost.completionCost,
                      cost: cost.totalCost
                    },
                    chatId
                  );
                  console.log("[chat-tracker] upsert SUCCESS for", trackingId);
                } catch (err) {
                  console.error("[chat-tracker] upsert FAILED:", String(err));
                }
              }
              return;
            }
            if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
              throw Error("Cannot continue message: Maximum segments reached");
            }
            const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;
            logger$6.info(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);
            const lastUserMessage = messages.filter((x) => x.role == "user").slice(-1)[0];
            const { model, provider } = extractPropertiesFromMessage(lastUserMessage);
            messages.push({ id: generateId$1(), role: "assistant", content });
            messages.push({
              id: generateId$1(),
              role: "user",
              content: `[Model: ${model}]

[Provider: ${provider}]

${CONTINUE_PROMPT}`
            });
            const result2 = await streamText({
              messages,
              env: context.cloudflare?.env,
              options,
              apiKeys,
              files,
              providerSettings,
              promptId,
              contextOptimization,
              contextFiles: filteredFiles,
              summary,
              messageSliceId,
              onSkillsLoaded: (skills) => {
                loadedSkills = skills;
              }
            });
            result2.mergeIntoDataStream(dataStream2);
            (async () => {
              for await (const part of result2.fullStream) {
                if (part.type === "error") {
                  const error = part.error;
                  logger$6.error(`${error}`);
                  dataStream2.writeData({ type: "error", error: classifyProviderError(error) });
                  return;
                }
              }
            })();
            return;
          }
        };
        dataStream2.writeData({
          type: "progress",
          label: "response",
          status: "in-progress",
          order: progressCounter++,
          message: "Generating Response"
        });
        const result = await streamText({
          messages,
          env: context.cloudflare?.env,
          options,
          apiKeys,
          files,
          providerSettings,
          promptId,
          contextOptimization,
          contextFiles: filteredFiles,
          summary,
          messageSliceId,
          onSkillsLoaded: (skills) => {
            loadedSkills = skills;
          }
        });
        (async () => {
          for await (const part of result.fullStream) {
            if (part.type === "error") {
              const error = part.error;
              logger$6.error(`${error}`);
              dataStream2.writeData({ type: "error", error: classifyProviderError(error) });
              return;
            }
          }
        })();
        result.mergeIntoDataStream(dataStream2);
      },
      onError: (error) => `Custom error: ${error.message}`
    }).pipeThrough(
      new TransformStream({
        transform: (chunk, controller) => {
          if (!lastChunk) {
            lastChunk = " ";
          }
          if (typeof chunk === "string") {
            if (chunk.startsWith("g") && !lastChunk.startsWith("g")) {
              controller.enqueue(encoder.encode(`0: "<div class=\\"__boltThought__\\">"
`));
            }
            if (lastChunk.startsWith("g") && !chunk.startsWith("g")) {
              controller.enqueue(encoder.encode(`0: "</div>\\n"
`));
            }
          }
          lastChunk = chunk;
          let transformedChunk = chunk;
          if (typeof chunk === "string" && chunk.startsWith("g")) {
            let content = chunk.split(":").slice(1).join(":");
            if (content.endsWith("\n")) {
              content = content.slice(0, content.length - 1);
            }
            transformedChunk = `0:${content}
`;
          }
          const str = typeof transformedChunk === "string" ? transformedChunk : JSON.stringify(transformedChunk);
          controller.enqueue(encoder.encode(str));
        }
      })
    );
    return new Response(dataStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
        "Text-Encoding": "chunked"
      }
    });
  } catch (error) {
    logger$6.error(error);
    const classified = classifyProviderError(error);
    if (classified.code === "credits_exhausted") {
      throw new Response(classified.message, { status: 402, statusText: "Payment Required" });
    }
    if (classified.code === "invalid_api_key") {
      throw new Response(classified.message, { status: 401, statusText: "Unauthorized" });
    }
    throw new Response(classified.message, { status: 500, statusText: "Internal Server Error" });
  }
}
function classifyProviderError(error) {
  const msg = (error?.message ?? error?.toString() ?? "").toLowerCase();
  const status = error?.status ?? error?.statusCode ?? 0;
  if (msg.includes("credit") || msg.includes("billing") || msg.includes("insufficient_quota") || msg.includes("exceeded your current quota") || status === 402) {
    return {
      code: "credits_exhausted",
      message: "You have run out of API credits. Please top up your account and try again."
    };
  }
  if (msg.includes("api key") || msg.includes("api_key") || msg.includes("authentication") || status === 401) {
    return { code: "invalid_api_key", message: "Invalid or missing API key. Please check your settings." };
  }
  if (msg.includes("rate limit") || msg.includes("rate_limit") || status === 429) {
    return { code: "rate_limited", message: "Rate limit reached. Please wait a moment and try again." };
  }
  if (msg.includes("overloaded") || status === 529 || status === 503) {
    return { code: "overloaded", message: "The AI provider is currently overloaded. Please try again shortly." };
  }
  return { code: "unknown", message: error?.message ?? "An unexpected error occurred. Please try again." };
}

const route36 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action: action$1
}, Symbol.toStringTag, { value: 'Module' }));

const Menu = undefined;

function classNames(...args) {
  let classes = "";
  for (const arg of args) {
    classes = appendClass(classes, parseValue(arg));
  }
  return classes;
}
function parseValue(arg) {
  if (typeof arg === "string" || typeof arg === "number") {
    return arg;
  }
  if (typeof arg !== "object") {
    return "";
  }
  if (Array.isArray(arg)) {
    return classNames(...arg);
  }
  let classes = "";
  for (const key in arg) {
    if (arg[key]) {
      classes = appendClass(classes, key);
    }
  }
  return classes;
}
function appendClass(value, newClass) {
  if (!newClass) {
    return value;
  }
  if (value) {
    return value + " " + newClass;
  }
  return value + newClass;
}

const IconButton = memo(
  forwardRef(
    ({
      icon,
      size = "xl",
      className,
      iconClassName,
      disabledClassName,
      disabled = false,
      title,
      onClick,
      children
    }, ref) => {
      return /* @__PURE__ */ jsx(
        "button",
        {
          ref,
          className: classNames(
            "flex items-center text-bolt-elements-item-contentDefault bg-transparent enabled:hover:text-bolt-elements-item-contentActive rounded-md p-1 enabled:hover:bg-bolt-elements-item-backgroundActive disabled:cursor-not-allowed focus:outline-none",
            {
              [classNames("opacity-30", disabledClassName)]: disabled
            },
            className
          ),
          title,
          disabled,
          onClick: (event) => {
            if (disabled) {
              return;
            }
            onClick?.(event);
          },
          children: children ? children : /* @__PURE__ */ jsx("div", { className: classNames(icon, getIconSize(size), iconClassName) })
        }
      );
    }
  )
);
function getIconSize(size) {
  if (size === "sm") {
    return "text-sm";
  } else if (size === "md") {
    return "text-md";
  } else if (size === "lg") {
    return "text-lg";
  } else if (size === "xl") {
    return "text-xl";
  } else {
    return "text-2xl";
  }
}

const Workbench = undefined;

const Messages = undefined;

const SendButton = undefined;

const providerEnvKeyStatusCache = {};
const apiKeyMemoizeCache = {};
function getApiKeysFromCookies() {
  const storedApiKeys = Cookies.get("apiKeys");
  let parsedKeys = {};
  if (storedApiKeys) {
    parsedKeys = apiKeyMemoizeCache[storedApiKeys];
    if (!parsedKeys) {
      parsedKeys = apiKeyMemoizeCache[storedApiKeys] = JSON.parse(storedApiKeys);
    }
  }
  return parsedKeys;
}
const APIKeyManager = ({ provider, apiKey, setApiKey }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [isEnvKeySet, setIsEnvKeySet] = useState(false);
  useEffect(() => {
    const savedKeys = getApiKeysFromCookies();
    const savedKey = savedKeys[provider.name] || "";
    setTempKey(savedKey);
    setApiKey(savedKey);
    setIsEditing(false);
  }, [provider.name]);
  const checkEnvApiKey = useCallback(async () => {
    if (providerEnvKeyStatusCache[provider.name] !== void 0) {
      setIsEnvKeySet(providerEnvKeyStatusCache[provider.name]);
      return;
    }
    try {
      const response = await fetch(`/api/check-env-key?provider=${encodeURIComponent(provider.name)}`);
      const data = await response.json();
      const isSet = data.isSet;
      providerEnvKeyStatusCache[provider.name] = isSet;
      setIsEnvKeySet(isSet);
    } catch (error) {
      console.error("Failed to check environment API key:", error);
      setIsEnvKeySet(false);
    }
  }, [provider.name]);
  useEffect(() => {
    checkEnvApiKey();
  }, [checkEnvApiKey]);
  const handleSave = () => {
    setApiKey(tempKey);
    const currentKeys = getApiKeysFromCookies();
    const newKeys = { ...currentKeys, [provider.name]: tempKey };
    Cookies.set("apiKeys", JSON.stringify(newKeys));
    setIsEditing(false);
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between py-3 px-1", children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 flex-1", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxs("span", { className: "text-sm font-medium text-bolt-elements-textSecondary", children: [
        provider?.name,
        " API Key:"
      ] }),
      !isEditing && /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: apiKey ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { className: "i-ph:check-circle-fill text-green-500 w-4 h-4" }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-green-500", children: "Set via UI" })
      ] }) : isEnvKeySet ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { className: "i-ph:check-circle-fill text-green-500 w-4 h-4" }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-green-500", children: "Set via environment variable" })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { className: "i-ph:x-circle-fill text-red-500 w-4 h-4" }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-red-500", children: "Not Set (Please set via UI or ENV_VAR)" })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 shrink-0", children: isEditing ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "password",
          value: tempKey,
          placeholder: "Enter API Key",
          onChange: (e) => setTempKey(e.target.value),
          className: "w-[300px] px-3 py-1.5 text-sm rounded border border-bolt-elements-borderColor \n                        bg-bolt-elements-prompt-background text-bolt-elements-textPrimary \n                        focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
        }
      ),
      /* @__PURE__ */ jsx(
        IconButton,
        {
          onClick: handleSave,
          title: "Save API Key",
          className: "bg-green-500/10 hover:bg-green-500/20 text-green-500",
          children: /* @__PURE__ */ jsx("div", { className: "i-ph:check w-4 h-4" })
        }
      ),
      /* @__PURE__ */ jsx(
        IconButton,
        {
          onClick: () => setIsEditing(false),
          title: "Cancel",
          className: "bg-red-500/10 hover:bg-red-500/20 text-red-500",
          children: /* @__PURE__ */ jsx("div", { className: "i-ph:x w-4 h-4" })
        }
      )
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
        IconButton,
        {
          onClick: () => setIsEditing(true),
          title: "Edit API Key",
          className: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-500",
          children: /* @__PURE__ */ jsx("div", { className: "i-ph:pencil-simple w-4 h-4" })
        }
      ),
      provider?.getApiKeyLink && !apiKey && /* @__PURE__ */ jsxs(
        IconButton,
        {
          onClick: () => window.open(provider?.getApiKeyLink),
          title: "Get API Key",
          className: "bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 flex items-center gap-2",
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs whitespace-nowrap", children: provider?.labelForGetApiKey || "Get API Key" }),
            /* @__PURE__ */ jsx("div", { className: `${provider?.icon || "i-ph:key"} w-4 h-4` })
          ]
        }
      )
    ] }) })
  ] });
};

const BaseChat$1 = "_";
const Chat$1 = "a";
const PromptEffectContainer = "b";
const PromptEffectLine = "c";
const PromptShine = "d";
const styles$1 = {
	BaseChat: BaseChat$1,
	Chat: Chat$1,
	PromptEffectContainer: PromptEffectContainer,
	PromptEffectLine: PromptEffectLine,
	PromptShine: PromptShine
};

const WithTooltip = forwardRef(
  ({
    tooltip,
    children,
    sideOffset = 5,
    className = "",
    arrowClassName = "",
    tooltipStyle = {},
    position = "top",
    maxWidth = 250,
    delay = 0
  }, _ref) => {
    return /* @__PURE__ */ jsx(TooltipPrimitive.Provider, { children: /* @__PURE__ */ jsxs(TooltipPrimitive.Root, { delayDuration: delay, children: [
      /* @__PURE__ */ jsx(TooltipPrimitive.Trigger, { asChild: true, children }),
      /* @__PURE__ */ jsx(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsxs(
        TooltipPrimitive.Content,
        {
          side: position,
          className: `
                z-[2000]
                px-2.5
                py-1.5
                max-h-[300px]
                select-none
                rounded-md
                bg-bolt-elements-background-depth-3
                text-bolt-elements-textPrimary
                text-sm
                leading-tight
                shadow-lg
                animate-in
                fade-in-0
                zoom-in-95
                data-[state=closed]:animate-out
                data-[state=closed]:fade-out-0
                data-[state=closed]:zoom-out-95
                ${className}
              `,
          sideOffset,
          style: {
            maxWidth,
            ...tooltipStyle
          },
          children: [
            /* @__PURE__ */ jsx("div", { className: "break-words", children: tooltip }),
            /* @__PURE__ */ jsx(
              TooltipPrimitive.Arrow,
              {
                className: `
                  fill-bolt-elements-background-depth-3
                  ${arrowClassName}
                `,
                width: 12,
                height: 6
              }
            )
          ]
        }
      ) })
    ] }) });
  }
);

const ExportChatButton = ({ exportChat }) => {
  return /* @__PURE__ */ jsx(WithTooltip, { tooltip: "Export Chat", children: /* @__PURE__ */ jsx(IconButton, { title: "Export Chat", onClick: () => exportChat?.(), children: /* @__PURE__ */ jsx("div", { className: "i-ph:download-simple text-xl" }) }) });
};

const IGNORE_PATTERNS$1 = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  ".next/**",
  "coverage/**",
  ".cache/**",
  ".vscode/**",
  ".idea/**",
  "**/*.log",
  "**/.DS_Store",
  "**/npm-debug.log*",
  "**/yarn-debug.log*",
  "**/yarn-error.log*"
];
const MAX_FILES = 1e3;
const ig$1 = ignore().add(IGNORE_PATTERNS$1);
const generateId = () => Math.random().toString(36).substring(2, 15);
const isBinaryFile$1 = async (file) => {
  const chunkSize = 1024;
  const buffer = new Uint8Array(await file.slice(0, chunkSize).arrayBuffer());
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    if (byte === 0 || byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
      return true;
    }
  }
  return false;
};
const shouldIncludeFile = (path) => {
  return !ig$1.ignores(path);
};

async function detectProjectCommands(files) {
  const hasFile = (name) => files.some((f) => f.path.endsWith(name));
  if (hasFile("package.json")) {
    const packageJsonFile = files.find((f) => f.path.endsWith("package.json"));
    if (!packageJsonFile) {
      return { type: "", setupCommand: "", followupMessage: "" };
    }
    try {
      const packageJson = JSON.parse(packageJsonFile.content);
      const scripts = packageJson?.scripts || {};
      const preferredCommands = ["dev", "start", "preview"];
      const availableCommand = preferredCommands.find((cmd) => scripts[cmd]);
      if (availableCommand) {
        return {
          type: "Node.js",
          setupCommand: `npm install`,
          startCommand: `npm run ${availableCommand}`,
          followupMessage: `Found "${availableCommand}" script in package.json. Running "npm run ${availableCommand}" after installation.`
        };
      }
      return {
        type: "Node.js",
        setupCommand: "npm install",
        followupMessage: "Would you like me to inspect package.json to determine the available scripts for running this project?"
      };
    } catch (error) {
      console.error("Error parsing package.json:", error);
      return { type: "", setupCommand: "", followupMessage: "" };
    }
  }
  if (hasFile("index.html")) {
    return {
      type: "Static",
      startCommand: "npx --yes serve",
      followupMessage: ""
    };
  }
  return { type: "", setupCommand: "", followupMessage: "" };
}
function createCommandsMessage(commands) {
  if (!commands.setupCommand && !commands.startCommand) {
    return null;
  }
  let commandString = "";
  if (commands.setupCommand) {
    commandString += `
<boltAction type="shell">${commands.setupCommand}</boltAction>`;
  }
  if (commands.startCommand) {
    commandString += `
<boltAction type="start">${commands.startCommand}</boltAction>
`;
  }
  return {
    role: "assistant",
    content: `
${commands.followupMessage ? `

${commands.followupMessage}` : ""}
<boltArtifact id="project-setup" title="Project Setup">
${commandString}
</boltArtifact>`,
    id: generateId(),
    createdAt: /* @__PURE__ */ new Date()
  };
}
function escapeBoltArtifactTags(input) {
  const regex = /(<boltArtifact[^>]*>)([\s\S]*?)(<\/boltArtifact>)/g;
  return input.replace(regex, (match, openTag, content, closeTag) => {
    const escapedOpenTag = openTag.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const escapedCloseTag = closeTag.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `${escapedOpenTag}${content}${escapedCloseTag}`;
  });
}
function escapeBoltAActionTags(input) {
  const regex = /(<boltAction[^>]*>)([\s\S]*?)(<\/boltAction>)/g;
  return input.replace(regex, (match, openTag, content, closeTag) => {
    const escapedOpenTag = openTag.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const escapedCloseTag = closeTag.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `${escapedOpenTag}${content}${escapedCloseTag}`;
  });
}
function escapeBoltTags(input) {
  return escapeBoltArtifactTags(escapeBoltAActionTags(input));
}

const createChatFromFolder = async (files, binaryFiles, folderName) => {
  const fileArtifacts = await Promise.all(
    files.map(async (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result;
          const relativePath = file.webkitRelativePath.split("/").slice(1).join("/");
          resolve({
            content,
            path: relativePath
          });
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    })
  );
  const commands = await detectProjectCommands(fileArtifacts);
  const commandsMessage = createCommandsMessage(commands);
  const binaryFilesMessage = binaryFiles.length > 0 ? `

Skipped ${binaryFiles.length} binary files:
${binaryFiles.map((f) => `- ${f}`).join("\n")}` : "";
  const filesMessage = {
    role: "assistant",
    content: `I've imported the contents of the "${folderName}" folder.${binaryFilesMessage}

<boltArtifact id="imported-files" title="Imported Files" type="bundled" >
${fileArtifacts.map(
      (file) => `<boltAction type="file" filePath="${file.path}">
${escapeBoltTags(file.content)}
</boltAction>`
    ).join("\n\n")}
</boltArtifact>`,
    id: generateId(),
    createdAt: /* @__PURE__ */ new Date()
  };
  const userMessage = {
    role: "user",
    id: generateId(),
    content: `Import the "${folderName}" folder`,
    createdAt: /* @__PURE__ */ new Date()
  };
  const messages = [userMessage, filesMessage];
  if (commandsMessage) {
    messages.push({
      role: "user",
      id: generateId(),
      content: "Setup the codebase and Start the application"
    });
    messages.push(commandsMessage);
  }
  return messages;
};

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bolt-elements-borderColor disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-bolt-elements-background text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-bolt-elements-borderColor bg-transparent hover:bg-bolt-elements-background-depth-2 hover:text-bolt-elements-textPrimary text-bolt-elements-textPrimary dark:border-bolt-elements-borderColorActive",
        secondary: "bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2",
        ghost: "hover:bg-bolt-elements-background-depth-1 hover:text-bolt-elements-textPrimary",
        link: "text-bolt-elements-textPrimary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button$1 = React.forwardRef(
  ({ className, variant, size, _asChild = false, ...props }, ref) => {
    return /* @__PURE__ */ jsx("button", { className: classNames(buttonVariants({ variant, size }), className), ref, ...props });
  }
);
Button$1.displayName = "Button";

const ImportFolderButton = ({ className, importChat }) => {
  const [isLoading, setIsLoading] = useState(false);
  const handleFileChange = async (e) => {
    const allFiles = Array.from(e.target.files || []);
    const filteredFiles = allFiles.filter((file) => {
      const path = file.webkitRelativePath.split("/").slice(1).join("/");
      const include = shouldIncludeFile(path);
      return include;
    });
    if (filteredFiles.length === 0) {
      const error = new Error("No valid files found");
      logStore.logError("File import failed - no valid files", error, { folderName: "Unknown Folder" });
      toast.error("No files found in the selected folder");
      return;
    }
    if (filteredFiles.length > MAX_FILES) {
      const error = new Error(`Too many files: ${filteredFiles.length}`);
      logStore.logError("File import failed - too many files", error, {
        fileCount: filteredFiles.length,
        maxFiles: MAX_FILES
      });
      toast.error(
        `This folder contains ${filteredFiles.length.toLocaleString()} files. This product is not yet optimized for very large projects. Please select a folder with fewer than ${MAX_FILES.toLocaleString()} files.`
      );
      return;
    }
    const folderName = filteredFiles[0]?.webkitRelativePath.split("/")[0] || "Unknown Folder";
    setIsLoading(true);
    const loadingToast = toast.loading(`Importing ${folderName}...`);
    try {
      const fileChecks = await Promise.all(
        filteredFiles.map(async (file) => ({
          file,
          isBinary: await isBinaryFile$1(file)
        }))
      );
      const textFiles = fileChecks.filter((f) => !f.isBinary).map((f) => f.file);
      const binaryFilePaths = fileChecks.filter((f) => f.isBinary).map((f) => f.file.webkitRelativePath.split("/").slice(1).join("/"));
      if (textFiles.length === 0) {
        const error = new Error("No text files found");
        logStore.logError("File import failed - no text files", error, { folderName });
        toast.error("No text files found in the selected folder");
        return;
      }
      if (binaryFilePaths.length > 0) {
        logStore.logWarning(`Skipping binary files during import`, {
          folderName,
          binaryCount: binaryFilePaths.length
        });
        toast.info(`Skipping ${binaryFilePaths.length} binary files`);
      }
      const messages = await createChatFromFolder(textFiles, binaryFilePaths, folderName);
      if (importChat) {
        await importChat(folderName, [...messages]);
      }
      logStore.logSystem("Folder imported successfully", {
        folderName,
        textFileCount: textFiles.length,
        binaryFileCount: binaryFilePaths.length
      });
      toast.success("Folder imported successfully");
    } catch (error) {
      logStore.logError("Failed to import folder", error, { folderName });
      console.error("Failed to import folder:", error);
      toast.error("Failed to import folder");
    } finally {
      setIsLoading(false);
      toast.dismiss(loadingToast);
      e.target.value = "";
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "file",
        id: "folder-import",
        className: "hidden",
        webkitdirectory: "",
        directory: "",
        onChange: handleFileChange,
        ...{}
      }
    ),
    /* @__PURE__ */ jsxs(
      Button$1,
      {
        onClick: () => {
          const input = document.getElementById("folder-import");
          input?.click();
        },
        title: "Import Folder",
        variant: "default",
        size: "lg",
        className: classNames(
          "gap-2 bg-bolt-elements-background-depth-1",
          "text-bolt-elements-textPrimary",
          "hover:bg-bolt-elements-background-depth-2",
          "border border-bolt-elements-borderColor",
          "h-10 px-4 py-2 min-w-[120px] justify-center",
          "transition-all duration-200 ease-in-out",
          className
        ),
        disabled: isLoading,
        children: [
          /* @__PURE__ */ jsx("span", { className: "i-ph:upload-simple w-4 h-4" }),
          isLoading ? "Importing..." : "Import Folder"
        ]
      }
    )
  ] });
};

function ImportButtons(importChat) {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center w-auto", children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "file",
        id: "chat-import",
        className: "hidden",
        accept: ".json",
        onChange: async (e) => {
          const file = e.target.files?.[0];
          if (file && importChat) {
            try {
              const reader = new FileReader();
              reader.onload = async (e2) => {
                try {
                  const content = e2.target?.result;
                  const data = JSON.parse(content);
                  if (Array.isArray(data.messages)) {
                    await importChat(data.description || "Imported Chat", data.messages);
                    toast.success("Chat imported successfully");
                    return;
                  }
                  toast.error("Invalid chat file format");
                } catch (error) {
                  if (error instanceof Error) {
                    toast.error("Failed to parse chat file: " + error.message);
                  } else {
                    toast.error("Failed to parse chat file");
                  }
                }
              };
              reader.onerror = () => toast.error("Failed to read chat file");
              reader.readAsText(file);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Failed to import chat");
            }
            e.target.value = "";
          } else {
            toast.error("Something went wrong");
          }
        }
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col items-center gap-4 max-w-2xl text-center", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxs(
        Button$1,
        {
          onClick: () => {
            const input = document.getElementById("chat-import");
            input?.click();
          },
          variant: "default",
          size: "lg",
          className: classNames(
            "gap-2 bg-bolt-elements-background-depth-1",
            "text-bolt-elements-textPrimary",
            "hover:bg-bolt-elements-background-depth-2",
            "border border-bolt-elements-borderColor",
            "h-10 px-4 py-2 min-w-[120px] justify-center",
            "transition-all duration-200 ease-in-out"
          ),
          children: [
            /* @__PURE__ */ jsx("span", { className: "i-ph:upload-simple w-4 h-4" }),
            "Import Chat"
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        ImportFolderButton,
        {
          importChat,
          className: classNames(
            "gap-2 bg-bolt-elements-background-depth-1",
            "text-bolt-elements-textPrimary",
            "hover:bg-bolt-elements-background-depth-2",
            "border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]",
            "h-10 px-4 py-2 min-w-[120px] justify-center",
            "transition-all duration-200 ease-in-out rounded-lg"
          )
        }
      )
    ] }) })
  ] });
}

const EXAMPLE_PROMPTS = [
  { text: "Build a SaaS landing page with dark theme" },
  { text: "Build a todo app in React using Tailwind" },
  { text: "Build a simple blog using Astro" },
  { text: "Create a cookie consent form using Material UI" },
  { text: "Make a space invaders game" },
  { text: "Make a Tic Tac Toe game in html, css and js only" }
];
function ExamplePrompts(sendMessage) {
  return /* @__PURE__ */ jsx("div", { id: "examples", className: "relative flex flex-col gap-9 w-full max-w-3xl mx-auto flex justify-center mt-6", children: /* @__PURE__ */ jsx(
    "div",
    {
      className: "flex flex-wrap justify-center gap-2",
      style: {
        animation: ".25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards"
      },
      children: EXAMPLE_PROMPTS.map((examplePrompt, index) => {
        return /* @__PURE__ */ jsx(
          "button",
          {
            onClick: (event) => {
              sendMessage?.(event, examplePrompt.text);
            },
            className: "border border-bolt-elements-borderColor rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary px-3 py-1 text-xs transition-theme",
            children: examplePrompt.text
          },
          index
        );
      })
    }
  ) });
}

let webcontainer = new Promise(() => {
});

const lookupSavedPassword = (url) => {
  const domain = url.split("/")[2];
  const gitCreds = Cookies.get(`git:${domain}`);
  if (!gitCreds) {
    return null;
  }
  try {
    const { username, password } = JSON.parse(gitCreds || "{}");
    return { username, password };
  } catch (error) {
    console.log(`Failed to parse Git Cookie ${error}`);
    return null;
  }
};
const saveGitAuth = (url, auth) => {
  const domain = url.split("/")[2];
  Cookies.set(`git:${domain}`, JSON.stringify(auth));
};
function useGit() {
  const [ready, setReady] = useState(false);
  const [webcontainer$1, setWebcontainer] = useState();
  const [fs, setFs] = useState();
  const fileData = useRef({});
  useEffect(() => {
    webcontainer.then((container) => {
      fileData.current = {};
      setWebcontainer(container);
      setFs(getFs(container, fileData));
      setReady(true);
    });
  }, []);
  const gitClone = useCallback(
    async (url, retryCount = 0) => {
      if (!webcontainer$1 || !fs || !ready) {
        throw new Error("Webcontainer not initialized. Please try again later.");
      }
      fileData.current = {};
      const headers = {
        "User-Agent": "sitara-builder"
      };
      const auth = lookupSavedPassword(url);
      if (auth) {
        headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`;
      }
      try {
        if (retryCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1e3 * retryCount));
          console.log(`Retrying git clone (attempt ${retryCount + 1})...`);
        }
        await git.clone({
          fs,
          http,
          dir: webcontainer$1.workdir,
          url,
          depth: 1,
          singleBranch: true,
          corsProxy: "/api/git-proxy",
          headers,
          onProgress: (event) => {
            console.log("Git clone progress:", event);
          },
          onAuth: (url2) => {
            let auth2 = lookupSavedPassword(url2);
            if (auth2) {
              console.log("Using saved authentication for", url2);
              return auth2;
            }
            console.log("Repository requires authentication:", url2);
            if (confirm("This repository requires authentication. Would you like to enter your GitHub credentials?")) {
              auth2 = {
                username: prompt("Enter username") || "",
                password: prompt("Enter password or personal access token") || ""
              };
              return auth2;
            } else {
              return { cancel: true };
            }
          },
          onAuthFailure: (url2, _auth) => {
            console.error(`Authentication failed for ${url2}`);
            toast.error(`Authentication failed for ${url2.split("/")[2]}. Please check your credentials and try again.`);
            throw new Error(
              `Authentication failed for ${url2.split("/")[2]}. Please check your credentials and try again.`
            );
          },
          onAuthSuccess: (url2, auth2) => {
            console.log(`Authentication successful for ${url2}`);
            saveGitAuth(url2, auth2);
          }
        });
        const data = {};
        for (const [key, value] of Object.entries(fileData.current)) {
          data[key] = value;
        }
        return { workdir: webcontainer$1.workdir, data };
      } catch (error) {
        console.error("Git clone error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Authentication failed")) {
          toast.error(`Authentication failed. Please check your GitHub credentials and try again.`);
          throw error;
        } else if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("ETIMEDOUT") || errorMessage.includes("ECONNREFUSED")) {
          toast.error(`Network error while connecting to repository. Please check your internet connection.`);
          if (retryCount < 3) {
            return gitClone(url, retryCount + 1);
          }
          throw new Error(
            `Failed to connect to repository after multiple attempts. Please check your internet connection.`
          );
        } else if (errorMessage.includes("404")) {
          toast.error(`Repository not found. Please check the URL and make sure the repository exists.`);
          throw new Error(`Repository not found. Please check the URL and make sure the repository exists.`);
        } else if (errorMessage.includes("401")) {
          toast.error(`Unauthorized access to repository. Please connect your GitHub account with proper permissions.`);
          throw new Error(
            `Unauthorized access to repository. Please connect your GitHub account with proper permissions.`
          );
        } else {
          toast.error(`Failed to clone repository: ${errorMessage}`);
          throw error;
        }
      }
    },
    [webcontainer$1, fs, ready]
  );
  return { ready, gitClone };
}
const getFs = (webcontainer, record) => ({
  promises: {
    readFile: async (path, options) => {
      const encoding = options?.encoding;
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      try {
        const result = await webcontainer.fs.readFile(relativePath, encoding);
        return result;
      } catch (error) {
        throw error;
      }
    },
    writeFile: async (path, data, options = {}) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      if (record.current) {
        record.current[relativePath] = { data, encoding: options?.encoding };
      }
      try {
        if (data instanceof Uint8Array) {
          const result = await webcontainer.fs.writeFile(relativePath, data);
          return result;
        } else {
          const encoding = options?.encoding || "utf8";
          const result = await webcontainer.fs.writeFile(relativePath, data, encoding);
          return result;
        }
      } catch (error) {
        throw error;
      }
    },
    mkdir: async (path, options) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      try {
        const result = await webcontainer.fs.mkdir(relativePath, { ...options, recursive: true });
        return result;
      } catch (error) {
        throw error;
      }
    },
    readdir: async (path, options) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      try {
        const result = await webcontainer.fs.readdir(relativePath, options);
        return result;
      } catch (error) {
        throw error;
      }
    },
    rm: async (path, options) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      try {
        const result = await webcontainer.fs.rm(relativePath, { ...options || {} });
        return result;
      } catch (error) {
        throw error;
      }
    },
    rmdir: async (path, options) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      try {
        const result = await webcontainer.fs.rm(relativePath, { recursive: true, ...options });
        return result;
      } catch (error) {
        throw error;
      }
    },
    unlink: async (path) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      try {
        return await webcontainer.fs.rm(relativePath, { recursive: false });
      } catch (error) {
        throw error;
      }
    },
    stat: async (path) => {
      try {
        const relativePath = pathUtils.relative(webcontainer.workdir, path);
        const dirPath = pathUtils.dirname(relativePath);
        const fileName = pathUtils.basename(relativePath);
        if (relativePath === ".git/index") {
          return {
            isFile: () => true,
            isDirectory: () => false,
            isSymbolicLink: () => false,
            size: 12,
            // Size of our empty index
            mode: 33188,
            // Regular file
            mtimeMs: Date.now(),
            ctimeMs: Date.now(),
            birthtimeMs: Date.now(),
            atimeMs: Date.now(),
            uid: 1e3,
            gid: 1e3,
            dev: 1,
            ino: 1,
            nlink: 1,
            rdev: 0,
            blksize: 4096,
            blocks: 1,
            mtime: /* @__PURE__ */ new Date(),
            ctime: /* @__PURE__ */ new Date(),
            birthtime: /* @__PURE__ */ new Date(),
            atime: /* @__PURE__ */ new Date()
          };
        }
        const resp = await webcontainer.fs.readdir(dirPath, { withFileTypes: true });
        const fileInfo = resp.find((x) => x.name === fileName);
        if (!fileInfo) {
          const err = new Error(`ENOENT: no such file or directory, stat '${path}'`);
          err.code = "ENOENT";
          err.errno = -2;
          err.syscall = "stat";
          err.path = path;
          throw err;
        }
        return {
          isFile: () => fileInfo.isFile(),
          isDirectory: () => fileInfo.isDirectory(),
          isSymbolicLink: () => false,
          size: fileInfo.isDirectory() ? 4096 : 1,
          mode: fileInfo.isDirectory() ? 16877 : 33188,
          // Directory or regular file
          mtimeMs: Date.now(),
          ctimeMs: Date.now(),
          birthtimeMs: Date.now(),
          atimeMs: Date.now(),
          uid: 1e3,
          gid: 1e3,
          dev: 1,
          ino: 1,
          nlink: 1,
          rdev: 0,
          blksize: 4096,
          blocks: 8,
          mtime: /* @__PURE__ */ new Date(),
          ctime: /* @__PURE__ */ new Date(),
          birthtime: /* @__PURE__ */ new Date(),
          atime: /* @__PURE__ */ new Date()
        };
      } catch (error) {
        if (!error.code) {
          error.code = "ENOENT";
          error.errno = -2;
          error.syscall = "stat";
          error.path = path;
        }
        throw error;
      }
    },
    lstat: async (path) => {
      return await getFs(webcontainer, record).promises.stat(path);
    },
    readlink: async (path) => {
      throw new Error(`EINVAL: invalid argument, readlink '${path}'`);
    },
    symlink: async (target, path) => {
      throw new Error(`EPERM: operation not permitted, symlink '${target}' -> '${path}'`);
    },
    chmod: async (_path, _mode) => {
      return await Promise.resolve();
    }
  }
});
const pathUtils = {
  dirname: (path) => {
    if (!path || !path.includes("/")) {
      return ".";
    }
    path = path.replace(/\/+$/, "");
    return path.split("/").slice(0, -1).join("/") || "/";
  },
  basename: (path, ext) => {
    path = path.replace(/\/+$/, "");
    const base = path.split("/").pop() || "";
    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }
    return base;
  },
  relative: (from, to) => {
    if (!from || !to) {
      return ".";
    }
    const normalizePathParts = (p) => p.replace(/\/+$/, "").split("/").filter(Boolean);
    const fromParts = normalizePathParts(from);
    const toParts = normalizePathParts(to);
    let commonLength = 0;
    const minLength = Math.min(fromParts.length, toParts.length);
    for (let i = 0; i < minLength; i++) {
      if (fromParts[i] !== toParts[i]) {
        break;
      }
      commonLength++;
    }
    const upCount = fromParts.length - commonLength;
    const remainingPath = toParts.slice(commonLength);
    const relativeParts = [...Array(upCount).fill(".."), ...remainingPath];
    return relativeParts.length === 0 ? "." : relativeParts.join("/");
  }
};

const LoadingOverlay = ({
  message = "Loading...",
  progress,
  progressText
}) => {
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 flex items-center justify-center bg-black/80 z-50 backdrop-blur-sm", children: /* @__PURE__ */ jsxs("div", { className: "relative flex flex-col items-center gap-4 p-8 rounded-lg bg-bolt-elements-background-depth-2 shadow-lg", children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress",
        style: { fontSize: "2rem" }
      }
    ),
    /* @__PURE__ */ jsx("p", { className: "text-lg text-bolt-elements-textTertiary", children: message }),
    progress !== void 0 && /* @__PURE__ */ jsxs("div", { className: "w-64 flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx("div", { className: "w-full h-2 bg-bolt-elements-background-depth-1 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
        "div",
        {
          className: "h-full bg-bolt-elements-loader-progress transition-all duration-300 ease-out rounded-full",
          style: { width: `${Math.min(100, Math.max(0, progress))}%` }
        }
      ) }),
      progressText && /* @__PURE__ */ jsx("p", { className: "text-sm text-bolt-elements-textTertiary text-center", children: progressText })
    ] })
  ] }) });
};

const isClient = typeof window !== "undefined" && typeof localStorage !== "undefined";
function getLocalStorage(key) {
  if (!isClient) {
    return null;
  }
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return null;
  }
}
function setLocalStorage(key, value) {
  if (!isClient) {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
}

const logger$5 = createScopedLogger("ChatHistory");
async function openDatabase() {
  if (typeof indexedDB === "undefined") {
    console.error("indexedDB is not available in this environment.");
    return void 0;
  }
  return new Promise((resolve) => {
    const request = indexedDB.open("boltHistory", 2);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains("chats")) {
          const store = db.createObjectStore("chats", { keyPath: "id" });
          store.createIndex("id", "id", { unique: true });
          store.createIndex("urlId", "urlId", { unique: true });
        }
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("snapshots")) {
          db.createObjectStore("snapshots", { keyPath: "chatId" });
        }
      }
    };
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    request.onerror = (event) => {
      resolve(void 0);
      logger$5.error(event.target.error);
    };
  });
}

const path = {
  join: (...paths) => pathBrowserify.join(...paths),
  dirname: (path2) => pathBrowserify.dirname(path2),
  basename: (path2, ext) => pathBrowserify.basename(path2, ext),
  extname: (path2) => pathBrowserify.extname(path2),
  relative: (from, to) => pathBrowserify.relative(from, to),
  isAbsolute: (path2) => pathBrowserify.isAbsolute(path2),
  normalize: (path2) => pathBrowserify.normalize(path2),
  parse: (path2) => pathBrowserify.parse(path2),
  format: (pathObject) => pathBrowserify.format(pathObject)
};

function unreachable(message) {
  throw new Error(`Unreachable: ${message}`);
}

const logger$4 = createScopedLogger("ActionRunner");
class ActionCommandError extends Error {
  _output;
  _header;
  constructor(message, output) {
    const formattedMessage = `Failed To Execute Shell Command: ${message}

Output:
${output}`;
    super(formattedMessage);
    this._header = message;
    this._output = output;
    Object.setPrototypeOf(this, ActionCommandError.prototype);
    this.name = "ActionCommandError";
  }
  // Optional: Add a method to get just the terminal output
  get output() {
    return this._output;
  }
  get header() {
    return this._header;
  }
}
class ActionRunner {
  #webcontainer;
  #currentExecutionPromise = Promise.resolve();
  #shellTerminal;
  runnerId = atom(`${Date.now()}`);
  actions = map({});
  onAlert;
  onSupabaseAlert;
  onDeployAlert;
  buildOutput;
  constructor(webcontainerPromise, getShellTerminal, onAlert, onSupabaseAlert, onDeployAlert) {
    this.#webcontainer = webcontainerPromise;
    this.#shellTerminal = getShellTerminal;
    this.onAlert = onAlert;
    this.onSupabaseAlert = onSupabaseAlert;
    this.onDeployAlert = onDeployAlert;
  }
  addAction(data) {
    const { actionId } = data;
    const actions = this.actions.get();
    const action = actions[actionId];
    if (action) {
      return;
    }
    const abortController = new AbortController();
    this.actions.setKey(actionId, {
      ...data.action,
      status: "pending",
      executed: false,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: "aborted" });
      },
      abortSignal: abortController.signal
    });
    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: "running" });
    });
  }
  async runAction(data, isStreaming = false) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];
    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }
    if (action.executed) {
      return;
    }
    if (isStreaming && action.type !== "file") {
      return;
    }
    this.#updateAction(actionId, { ...action, ...data.action, executed: !isStreaming });
    this.#currentExecutionPromise = this.#currentExecutionPromise.then(() => {
      return this.#executeAction(actionId, isStreaming);
    }).catch((error) => {
      console.error("Action failed:", error);
    });
    await this.#currentExecutionPromise;
    return;
  }
  async #executeAction(actionId, isStreaming = false) {
    const action = this.actions.get()[actionId];
    this.#updateAction(actionId, { status: "running" });
    try {
      switch (action.type) {
        case "shell": {
          await this.#runShellAction(action);
          break;
        }
        case "file": {
          await this.#runFileAction(action);
          break;
        }
        case "supabase": {
          try {
            await this.handleSupabaseAction(action);
          } catch (error) {
            this.#updateAction(actionId, {
              status: "failed",
              error: error instanceof Error ? error.message : "Supabase action failed"
            });
            return;
          }
          break;
        }
        case "build": {
          const buildOutput = await this.#runBuildAction(action);
          this.buildOutput = buildOutput;
          break;
        }
        case "start": {
          this.#runStartAction(action).then(() => this.#updateAction(actionId, { status: "complete" })).catch((err) => {
            if (action.abortSignal.aborted) {
              return;
            }
            this.#updateAction(actionId, { status: "failed", error: "Action failed" });
            logger$4.error(`[${action.type}]:Action failed

`, err);
            if (!(err instanceof ActionCommandError)) {
              return;
            }
            this.onAlert?.({
              type: "error",
              title: "Dev Server Failed",
              description: err.header,
              content: err.output
            });
          });
          await new Promise((resolve) => setTimeout(resolve, 2e3));
          return;
        }
      }
      this.#updateAction(actionId, {
        status: isStreaming ? "running" : action.abortSignal.aborted ? "aborted" : "complete"
      });
    } catch (error) {
      if (action.abortSignal.aborted) {
        return;
      }
      this.#updateAction(actionId, { status: "failed", error: "Action failed" });
      logger$4.error(`[${action.type}]:Action failed

`, error);
      if (!(error instanceof ActionCommandError)) {
        return;
      }
      this.onAlert?.({
        type: "error",
        title: "Dev Server Failed",
        description: error.header,
        content: error.output
      });
      throw error;
    }
  }
  async #runShellAction(action) {
    if (action.type !== "shell") {
      unreachable("Expected shell action");
    }
    const shell = this.#shellTerminal();
    await shell.ready();
    if (!shell || !shell.terminal || !shell.process) {
      unreachable("Shell terminal not found");
    }
    const resp = await shell.executeCommand(this.runnerId.get(), action.content, () => {
      logger$4.debug(`[${action.type}]:Aborting Action

`, action);
      action.abort();
    });
    logger$4.debug(`${action.type} Shell Response: [exit code:${resp?.exitCode}]`);
    if (resp?.exitCode != 0) {
      throw new ActionCommandError(`Failed To Execute Shell Command`, resp?.output || "No Output Available");
    }
  }
  async #runStartAction(action) {
    if (action.type !== "start") {
      unreachable("Expected shell action");
    }
    if (!this.#shellTerminal) {
      unreachable("Shell terminal not found");
    }
    const shell = this.#shellTerminal();
    await shell.ready();
    if (!shell || !shell.terminal || !shell.process) {
      unreachable("Shell terminal not found");
    }
    const resp = await shell.executeCommand(this.runnerId.get(), action.content, () => {
      logger$4.debug(`[${action.type}]:Aborting Action

`, action);
      action.abort();
    });
    logger$4.debug(`${action.type} Shell Response: [exit code:${resp?.exitCode}]`);
    if (resp?.exitCode != 0) {
      throw new ActionCommandError("Failed To Start Application", resp?.output || "No Output Available");
    }
    return resp;
  }
  async #runFileAction(action) {
    if (action.type !== "file") {
      unreachable("Expected file action");
    }
    const webcontainer = await this.#webcontainer;
    const relativePath = path.relative(webcontainer.workdir, action.filePath);
    let folder = path.dirname(relativePath);
    folder = folder.replace(/\/+$/g, "");
    if (folder !== ".") {
      try {
        await webcontainer.fs.mkdir(folder, { recursive: true });
        logger$4.debug("Created folder", folder);
      } catch (error) {
        logger$4.error("Failed to create folder\n\n", error);
      }
    }
    try {
      await webcontainer.fs.writeFile(relativePath, action.content);
      logger$4.debug(`File written ${relativePath}`);
    } catch (error) {
      logger$4.error("Failed to write file\n\n", error);
    }
  }
  #updateAction(id, newState) {
    const actions = this.actions.get();
    this.actions.setKey(id, { ...actions[id], ...newState });
  }
  async getFileHistory(filePath) {
    try {
      const webcontainer = await this.#webcontainer;
      const historyPath = this.#getHistoryPath(filePath);
      const content = await webcontainer.fs.readFile(historyPath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      logger$4.error("Failed to get file history:", error);
      return null;
    }
  }
  async saveFileHistory(filePath, history) {
    const historyPath = this.#getHistoryPath(filePath);
    await this.#runFileAction({
      type: "file",
      filePath: historyPath,
      content: JSON.stringify(history),
      changeSource: "auto-save"
    });
  }
  #getHistoryPath(filePath) {
    return path.join(".history", filePath);
  }
  async #runBuildAction(action) {
    if (action.type !== "build") {
      unreachable("Expected build action");
    }
    this.onDeployAlert?.({
      type: "info",
      title: "Building Application",
      description: "Building your application...",
      stage: "building",
      buildStatus: "running",
      deployStatus: "pending",
      source: "netlify"
    });
    const webcontainer = await this.#webcontainer;
    const buildProcess = await webcontainer.spawn("npm", ["run", "build"]);
    let output = "";
    buildProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          output += data;
        }
      })
    );
    const exitCode = await buildProcess.exit;
    if (exitCode !== 0) {
      this.onDeployAlert?.({
        type: "error",
        title: "Build Failed",
        description: "Your application build failed",
        content: output || "No build output available",
        stage: "building",
        buildStatus: "failed",
        deployStatus: "pending",
        source: "netlify"
      });
      throw new ActionCommandError("Build Failed", output || "No Output Available");
    }
    this.onDeployAlert?.({
      type: "success",
      title: "Build Completed",
      description: "Your application was built successfully",
      stage: "deploying",
      buildStatus: "complete",
      deployStatus: "running",
      source: "netlify"
    });
    const commonBuildDirs = ["dist", "build", "out", "output", ".next", "public"];
    let buildDir = "";
    for (const dir of commonBuildDirs) {
      const dirPath = path.join(webcontainer.workdir, dir);
      try {
        await webcontainer.fs.readdir(dirPath);
        buildDir = dirPath;
        logger$4.debug(`Found build directory: ${buildDir}`);
        break;
      } catch (error) {
        logger$4.debug(`Build directory ${dir} not found, trying next option. ${error}`);
      }
    }
    if (!buildDir) {
      buildDir = path.join(webcontainer.workdir, "dist");
      logger$4.debug(`No build directory found, defaulting to: ${buildDir}`);
    }
    return {
      path: buildDir,
      exitCode,
      output
    };
  }
  async handleSupabaseAction(action) {
    const { operation, content, filePath } = action;
    logger$4.debug("[Supabase Action]:", { operation, filePath, content });
    switch (operation) {
      case "migration":
        if (!filePath) {
          throw new Error("Migration requires a filePath");
        }
        this.onSupabaseAlert?.({
          type: "info",
          title: "Supabase Migration",
          description: `Create migration file: ${filePath}`,
          content,
          source: "supabase"
        });
        await this.#runFileAction({
          type: "file",
          filePath,
          content,
          changeSource: "supabase"
        });
        return { success: true };
      case "query": {
        this.onSupabaseAlert?.({
          type: "info",
          title: "Supabase Query",
          description: "Execute database query",
          content,
          source: "supabase"
        });
        return { pending: true };
      }
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
  // Add this method declaration to the class
  handleDeployAction(stage, status, details) {
    if (!this.onDeployAlert) {
      logger$4.debug("No deploy alert handler registered");
      return;
    }
    const alertType = status === "failed" ? "error" : status === "complete" ? "success" : "info";
    const title = stage === "building" ? "Building Application" : stage === "deploying" ? "Deploying Application" : "Deployment Complete";
    const description = status === "failed" ? `${stage === "building" ? "Build" : "Deployment"} failed` : status === "running" ? `${stage === "building" ? "Building" : "Deploying"} your application...` : status === "complete" ? `${stage === "building" ? "Build" : "Deployment"} completed successfully` : `Preparing to ${stage === "building" ? "build" : "deploy"} your application`;
    const buildStatus = stage === "building" ? status : stage === "deploying" || stage === "complete" ? "complete" : "pending";
    const deployStatus = stage === "building" ? "pending" : status;
    this.onDeployAlert({
      type: alertType,
      title,
      description,
      content: details?.error || "",
      url: details?.url,
      stage,
      buildStatus,
      deployStatus,
      source: details?.source || "netlify"
    });
  }
}

const logger$3 = createScopedLogger("EditorStore");
class EditorStore {
  #filesStore;
  selectedFile = atom();
  documents = map({});
  currentDocument = computed([this.documents, this.selectedFile], (documents, selectedFile) => {
    if (!selectedFile) {
      return void 0;
    }
    return documents[selectedFile];
  });
  constructor(filesStore) {
    this.#filesStore = filesStore;
  }
  setDocuments(files) {
    const previousDocuments = this.documents.value;
    this.documents.set(
      Object.fromEntries(
        Object.entries(files).map(([filePath, dirent]) => {
          if (dirent === void 0 || dirent.type !== "file") {
            return void 0;
          }
          const previousDocument = previousDocuments?.[filePath];
          return [
            filePath,
            {
              value: dirent.content,
              filePath,
              scroll: previousDocument?.scroll
            }
          ];
        }).filter(Boolean)
      )
    );
  }
  setSelectedFile(filePath) {
    this.selectedFile.set(filePath);
  }
  updateScrollPosition(filePath, position) {
    const documents = this.documents.get();
    const documentState = documents[filePath];
    if (!documentState) {
      return;
    }
    this.documents.setKey(filePath, {
      ...documentState,
      scroll: position
    });
  }
  updateFile(filePath, newContent) {
    const documents = this.documents.get();
    const documentState = documents[filePath];
    if (!documentState) {
      return;
    }
    const file = this.#filesStore.getFile(filePath);
    if (file?.isLocked) {
      logger$3.warn(`Attempted to update locked file: ${filePath}`);
      return;
    }
    const currentContent = documentState.value;
    const contentChanged = currentContent !== newContent;
    if (contentChanged) {
      this.documents.setKey(filePath, {
        ...documentState,
        value: newContent
      });
    }
  }
}

function bufferWatchEvents(timeInMs, cb) {
  let timeoutId;
  let events = [];
  let processing = Promise.resolve();
  const scheduleBufferTick = () => {
    timeoutId = self.setTimeout(async () => {
      await processing;
      if (events.length > 0) {
        processing = Promise.resolve(cb(events));
      }
      timeoutId = void 0;
      events = [];
    }, timeInMs);
  };
  return (...args) => {
    events.push(args);
    if (!timeoutId) {
      scheduleBufferTick();
    }
  };
}

function computeFileModifications(files, modifiedFiles) {
  const modifications = {};
  let hasModifiedFiles = false;
  for (const [filePath, originalContent] of modifiedFiles) {
    const file = files[filePath];
    if (file?.type !== "file") {
      continue;
    }
    const unifiedDiff = diffFiles(filePath, originalContent, file.content);
    if (!unifiedDiff) {
      continue;
    }
    hasModifiedFiles = true;
    if (unifiedDiff.length > file.content.length) {
      modifications[filePath] = { type: "file", content: file.content };
    } else {
      modifications[filePath] = { type: "diff", content: unifiedDiff };
    }
  }
  if (!hasModifiedFiles) {
    return void 0;
  }
  return modifications;
}
function diffFiles(fileName, oldFileContent, newFileContent) {
  let unifiedDiff = createTwoFilesPatch(fileName, fileName, oldFileContent, newFileContent);
  const patchHeaderEnd = `--- ${fileName}
+++ ${fileName}
`;
  const headerEndIndex = unifiedDiff.indexOf(patchHeaderEnd);
  if (headerEndIndex >= 0) {
    unifiedDiff = unifiedDiff.slice(headerEndIndex + patchHeaderEnd.length);
  }
  if (unifiedDiff === "") {
    return void 0;
  }
  return unifiedDiff;
}
const regex = new RegExp(`^${WORK_DIR}/`);
function extractRelativePath(filePath) {
  return filePath.replace(regex, "");
}

const logger$2 = createScopedLogger("LockedFiles");
const LOCKED_FILES_KEY = "bolt.lockedFiles";
let lockedItemsCache = null;
const lockedItemsMap = /* @__PURE__ */ new Map();
let saveDebounceTimer = null;
const SAVE_DEBOUNCE_MS = 300;
function getChatMap(chatId, createIfMissing = false) {
  if (createIfMissing && !lockedItemsMap.has(chatId)) {
    lockedItemsMap.set(chatId, /* @__PURE__ */ new Map());
  }
  return lockedItemsMap.get(chatId);
}
function initializeCache() {
  if (lockedItemsCache !== null) {
    return lockedItemsCache;
  }
  try {
    if (typeof localStorage !== "undefined") {
      const lockedItemsJson = localStorage.getItem(LOCKED_FILES_KEY);
      if (lockedItemsJson) {
        const items = JSON.parse(lockedItemsJson);
        const normalizedItems = items.map((item) => ({
          ...item,
          isFolder: item.isFolder !== void 0 ? item.isFolder : false
        }));
        lockedItemsCache = normalizedItems;
        rebuildLookupMaps(normalizedItems);
        return normalizedItems;
      }
    }
    lockedItemsCache = [];
    return [];
  } catch (error) {
    logger$2.error("Failed to initialize locked items cache", error);
    lockedItemsCache = [];
    return [];
  }
}
function rebuildLookupMaps(items) {
  lockedItemsMap.clear();
  for (const item of items) {
    if (!lockedItemsMap.has(item.chatId)) {
      lockedItemsMap.set(item.chatId, /* @__PURE__ */ new Map());
    }
    const chatMap = lockedItemsMap.get(item.chatId);
    chatMap.set(item.path, item);
  }
}
function saveLockedItems(items) {
  lockedItemsCache = [...items];
  rebuildLookupMaps(items);
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(LOCKED_FILES_KEY, JSON.stringify(items));
        logger$2.info(`Saved ${items.length} locked items to localStorage`);
      }
    } catch (error) {
      logger$2.error("Failed to save locked items to localStorage", error);
    }
  }, SAVE_DEBOUNCE_MS);
}
function getLockedItems() {
  if (lockedItemsCache !== null) {
    return lockedItemsCache;
  }
  return initializeCache();
}
function addLockedItem(chatId, path, isFolder = false) {
  const lockedItems = getLockedItems();
  const newItem = { chatId, path, isFolder };
  const chatMap = getChatMap(chatId, true);
  chatMap.set(path, newItem);
  const filteredItems = lockedItems.filter((item) => !(item.chatId === chatId && item.path === path));
  filteredItems.push(newItem);
  saveLockedItems(filteredItems);
  logger$2.info(`Added locked ${isFolder ? "folder" : "file"}: ${path} for chat: ${chatId}`);
}
function addLockedFile(chatId, filePath) {
  addLockedItem(chatId, filePath);
}
function addLockedFolder(chatId, folderPath) {
  addLockedItem(chatId, folderPath);
}
function removeLockedItem(chatId, path) {
  const lockedItems = getLockedItems();
  const chatMap = getChatMap(chatId);
  if (chatMap) {
    chatMap.delete(path);
  }
  const filteredItems = lockedItems.filter((item) => !(item.chatId === chatId && item.path === path));
  saveLockedItems(filteredItems);
  logger$2.info(`Removed lock for: ${path} in chat: ${chatId}`);
}
function removeLockedFile(chatId, filePath) {
  removeLockedItem(chatId, filePath);
}
function removeLockedFolder(chatId, folderPath) {
  removeLockedItem(chatId, folderPath);
}
function checkParentFolderLocks(chatId, path) {
  const chatMap = getChatMap(chatId);
  if (!chatMap) {
    return { locked: false };
  }
  const pathParts = path.split("/");
  let currentPath = "";
  for (let i = 0; i < pathParts.length - 1; i++) {
    currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
    const folderLock = chatMap.get(currentPath);
    if (folderLock && folderLock.isFolder) {
      return { locked: true, lockedBy: currentPath };
    }
  }
  return { locked: false };
}
function getLockedItemsForChat(chatId) {
  const allItems = getLockedItems();
  const chatMap = getChatMap(chatId);
  if (chatMap) {
    return Array.from(chatMap.values());
  }
  return allItems.filter((item) => item.chatId === chatId);
}
function getLockedFilesForChat(chatId) {
  const chatItems = getLockedItemsForChat(chatId);
  return chatItems.filter((item) => !item.isFolder);
}
function getLockedFoldersForChat(chatId) {
  const chatItems = getLockedItemsForChat(chatId);
  return chatItems.filter((item) => item.isFolder);
}
function isPathInLockedFolder(chatId, path) {
  return checkParentFolderLocks(chatId, path);
}
function migrateLegacyLocks(currentChatId) {
  try {
    clearCache();
    if (typeof localStorage !== "undefined") {
      const lockedItemsJson = localStorage.getItem(LOCKED_FILES_KEY);
      if (lockedItemsJson) {
        const lockedItems = JSON.parse(lockedItemsJson);
        if (Array.isArray(lockedItems)) {
          let hasLegacyItems = false;
          const updatedItems = lockedItems.map((item) => {
            const needsUpdate = !item.chatId || item.isFolder === void 0;
            if (needsUpdate) {
              hasLegacyItems = true;
              return {
                ...item,
                chatId: item.chatId || currentChatId,
                isFolder: item.isFolder !== void 0 ? item.isFolder : false
              };
            }
            return item;
          });
          if (hasLegacyItems) {
            saveLockedItems(updatedItems);
            logger$2.info(`Migrated ${updatedItems.length} legacy locks to chat ID: ${currentChatId}`);
          }
        }
      }
    }
  } catch (error) {
    logger$2.error("Failed to migrate legacy locks", error);
  }
}
function clearCache() {
  lockedItemsCache = null;
  lockedItemsMap.clear();
  logger$2.info("Cleared locked items cache");
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === LOCKED_FILES_KEY) {
      logger$2.info("Detected localStorage change for locked items, refreshing cache");
      clearCache();
    }
  });
}

const logger$1 = createScopedLogger("FileLocks");
function getCurrentChatId() {
  try {
    if (typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/chat\/([^/]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return "default";
  } catch (error) {
    logger$1.error("Failed to get current chat ID", error);
    return "default";
  }
}

const logger = createScopedLogger("FilesStore");
const utf8TextDecoder = new TextDecoder("utf8", { fatal: true });
class FilesStore {
  #webcontainer;
  /**
   * Tracks the number of files without folders.
   */
  #size = 0;
  /**
   * @note Keeps track all modified files with their original content since the last user message.
   * Needs to be reset when the user sends another message and all changes have to be submitted
   * for the model to be aware of the changes.
   */
  #modifiedFiles = /* @__PURE__ */ new Map();
  /**
   * Keeps track of deleted files and folders to prevent them from reappearing on reload
   */
  #deletedPaths = /* @__PURE__ */ new Set();
  /**
   * Map of files that matches the state of WebContainer.
   */
  files = map({});
  get filesCount() {
    return this.#size;
  }
  constructor(webcontainerPromise) {
    this.#webcontainer = webcontainerPromise;
    try {
      if (typeof localStorage !== "undefined") {
        const deletedPathsJson = localStorage.getItem("bolt-deleted-paths");
        if (deletedPathsJson) {
          const deletedPaths = JSON.parse(deletedPathsJson);
          if (Array.isArray(deletedPaths)) {
            deletedPaths.forEach((path2) => this.#deletedPaths.add(path2));
          }
        }
      }
    } catch (error) {
      logger.error("Failed to load deleted paths from localStorage", error);
    }
    this.#loadLockedFiles();
    if (typeof window !== "undefined") {
      let lastChatId = getCurrentChatId();
      const observer = new MutationObserver(() => {
        const currentChatId = getCurrentChatId();
        if (currentChatId !== lastChatId) {
          logger.info(`Chat ID changed from ${lastChatId} to ${currentChatId}, reloading locks`);
          lastChatId = currentChatId;
          this.#loadLockedFiles(currentChatId);
        }
      });
      observer.observe(document, { subtree: true, childList: true });
    }
    this.#init();
  }
  /**
   * Load locked files and folders from localStorage and update the file objects
   * @param chatId Optional chat ID to load locks for (defaults to current chat)
   */
  #loadLockedFiles(chatId) {
    try {
      const currentChatId = chatId || getCurrentChatId();
      const startTime = performance.now();
      migrateLegacyLocks(currentChatId);
      const lockedItems = getLockedItemsForChat(currentChatId);
      const lockedFiles = lockedItems.filter((item) => !item.isFolder);
      const lockedFolders = lockedItems.filter((item) => item.isFolder);
      if (lockedItems.length === 0) {
        logger.info(`No locked items found for chat ID: ${currentChatId}`);
        return;
      }
      logger.info(
        `Found ${lockedFiles.length} locked files and ${lockedFolders.length} locked folders for chat ID: ${currentChatId}`
      );
      const currentFiles = this.files.get();
      const updates = {};
      for (const lockedFile of lockedFiles) {
        const file = currentFiles[lockedFile.path];
        if (file?.type === "file") {
          updates[lockedFile.path] = {
            ...file,
            isLocked: true
          };
        }
      }
      for (const lockedFolder of lockedFolders) {
        const folder = currentFiles[lockedFolder.path];
        if (folder?.type === "folder") {
          updates[lockedFolder.path] = {
            ...folder,
            isLocked: true
          };
          this.#applyLockToFolderContents(currentFiles, updates, lockedFolder.path);
        }
      }
      if (Object.keys(updates).length > 0) {
        this.files.set({ ...currentFiles, ...updates });
      }
      const endTime = performance.now();
      logger.info(`Loaded locked items in ${Math.round(endTime - startTime)}ms`);
    } catch (error) {
      logger.error("Failed to load locked files from localStorage", error);
    }
  }
  /**
   * Apply a lock to all files within a folder
   * @param currentFiles Current file map
   * @param updates Updates to apply
   * @param folderPath Path of the folder to lock
   */
  #applyLockToFolderContents(currentFiles, updates, folderPath) {
    const folderPrefix = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
    Object.entries(currentFiles).forEach(([path2, file]) => {
      if (path2.startsWith(folderPrefix) && file) {
        if (file.type === "file") {
          updates[path2] = {
            ...file,
            isLocked: true,
            // Add a property to indicate this is locked by a parent folder
            lockedByFolder: folderPath
          };
        } else if (file.type === "folder") {
          updates[path2] = {
            ...file,
            isLocked: true,
            // Add a property to indicate this is locked by a parent folder
            lockedByFolder: folderPath
          };
        }
      }
    });
  }
  /**
   * Lock a file
   * @param filePath Path to the file to lock
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns True if the file was successfully locked
   */
  lockFile(filePath, chatId) {
    const file = this.getFile(filePath);
    const currentChatId = chatId || getCurrentChatId();
    if (!file) {
      logger.error(`Cannot lock non-existent file: ${filePath}`);
      return false;
    }
    this.files.setKey(filePath, {
      ...file,
      isLocked: true
    });
    addLockedFile(currentChatId, filePath);
    logger.info(`File locked: ${filePath} for chat: ${currentChatId}`);
    return true;
  }
  /**
   * Lock a folder and all its contents
   * @param folderPath Path to the folder to lock
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns True if the folder was successfully locked
   */
  lockFolder(folderPath, chatId) {
    const folder = this.getFileOrFolder(folderPath);
    const currentFiles = this.files.get();
    const currentChatId = chatId || getCurrentChatId();
    if (!folder || folder.type !== "folder") {
      logger.error(`Cannot lock non-existent folder: ${folderPath}`);
      return false;
    }
    const updates = {};
    updates[folderPath] = {
      type: folder.type,
      isLocked: true
    };
    this.#applyLockToFolderContents(currentFiles, updates, folderPath);
    this.files.set({ ...currentFiles, ...updates });
    addLockedFolder(currentChatId, folderPath);
    logger.info(`Folder locked: ${folderPath} for chat: ${currentChatId}`);
    return true;
  }
  /**
   * Unlock a file
   * @param filePath Path to the file to unlock
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns True if the file was successfully unlocked
   */
  unlockFile(filePath, chatId) {
    const file = this.getFile(filePath);
    const currentChatId = chatId || getCurrentChatId();
    if (!file) {
      logger.error(`Cannot unlock non-existent file: ${filePath}`);
      return false;
    }
    this.files.setKey(filePath, {
      ...file,
      isLocked: false,
      lockedByFolder: void 0
      // Clear the parent folder lock reference if it exists
    });
    removeLockedFile(currentChatId, filePath);
    logger.info(`File unlocked: ${filePath} for chat: ${currentChatId}`);
    return true;
  }
  /**
   * Unlock a folder and all its contents
   * @param folderPath Path to the folder to unlock
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns True if the folder was successfully unlocked
   */
  unlockFolder(folderPath, chatId) {
    const folder = this.getFileOrFolder(folderPath);
    const currentFiles = this.files.get();
    const currentChatId = chatId || getCurrentChatId();
    if (!folder || folder.type !== "folder") {
      logger.error(`Cannot unlock non-existent folder: ${folderPath}`);
      return false;
    }
    const updates = {};
    updates[folderPath] = {
      type: folder.type,
      isLocked: false
    };
    const folderPrefix = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
    Object.entries(currentFiles).forEach(([path2, file]) => {
      if (path2.startsWith(folderPrefix) && file) {
        if (file.type === "file" && file.lockedByFolder === folderPath) {
          updates[path2] = {
            ...file,
            isLocked: false,
            lockedByFolder: void 0
          };
        } else if (file.type === "folder" && file.lockedByFolder === folderPath) {
          updates[path2] = {
            type: file.type,
            isLocked: false,
            lockedByFolder: void 0
          };
        }
      }
    });
    this.files.set({ ...currentFiles, ...updates });
    removeLockedFolder(currentChatId, folderPath);
    logger.info(`Folder unlocked: ${folderPath} for chat: ${currentChatId}`);
    return true;
  }
  /**
   * Check if a file is locked
   * @param filePath Path to the file to check
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns Object with locked status, lock mode, and what caused the lock
   */
  isFileLocked(filePath, chatId) {
    const file = this.getFile(filePath);
    const currentChatId = chatId || getCurrentChatId();
    if (!file) {
      return { locked: false };
    }
    if (file.isLocked) {
      if (file.lockedByFolder) {
        return {
          locked: true,
          lockedBy: file.lockedByFolder
        };
      }
      return {
        locked: true,
        lockedBy: filePath
      };
    }
    const lockedFiles = getLockedFilesForChat(currentChatId);
    const lockedFile = lockedFiles.find((item) => item.path === filePath);
    if (lockedFile) {
      this.files.setKey(filePath, {
        ...file,
        isLocked: true
      });
      return { locked: true, lockedBy: filePath };
    }
    const folderLockResult = this.isFileInLockedFolder(filePath, currentChatId);
    if (folderLockResult.locked) {
      this.files.setKey(filePath, {
        ...file,
        isLocked: true,
        lockedByFolder: folderLockResult.lockedBy
      });
      return folderLockResult;
    }
    return { locked: false };
  }
  /**
   * Check if a file is within a locked folder
   * @param filePath Path to the file to check
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns Object with locked status, lock mode, and the folder that caused the lock
   */
  isFileInLockedFolder(filePath, chatId) {
    const currentChatId = chatId || getCurrentChatId();
    return isPathInLockedFolder(currentChatId, filePath);
  }
  /**
   * Check if a folder is locked
   * @param folderPath Path to the folder to check
   * @param chatId Optional chat ID (defaults to current chat)
   * @returns Object with locked status and lock mode
   */
  isFolderLocked(folderPath, chatId) {
    const folder = this.getFileOrFolder(folderPath);
    const currentChatId = chatId || getCurrentChatId();
    if (!folder || folder.type !== "folder") {
      return { isLocked: false };
    }
    if (folder.isLocked) {
      return {
        isLocked: true,
        lockedBy: folderPath
      };
    }
    const lockedFolders = getLockedFoldersForChat(currentChatId);
    const lockedFolder = lockedFolders.find((item) => item.path === folderPath);
    if (lockedFolder) {
      this.files.setKey(folderPath, {
        type: folder.type,
        isLocked: true
      });
      return { isLocked: true, lockedBy: folderPath };
    }
    return { isLocked: false };
  }
  getFile(filePath) {
    const dirent = this.files.get()[filePath];
    if (!dirent) {
      return void 0;
    }
    if (dirent.type !== "file") {
      return void 0;
    }
    return dirent;
  }
  /**
   * Get any file or folder from the file system
   * @param path Path to the file or folder
   * @returns The file or folder, or undefined if it doesn't exist
   */
  getFileOrFolder(path2) {
    return this.files.get()[path2];
  }
  getFileModifications() {
    return computeFileModifications(this.files.get(), this.#modifiedFiles);
  }
  getModifiedFiles() {
    let modifiedFiles = void 0;
    for (const [filePath, originalContent] of this.#modifiedFiles) {
      const file = this.files.get()[filePath];
      if (file?.type !== "file") {
        continue;
      }
      if (file.content === originalContent) {
        continue;
      }
      if (!modifiedFiles) {
        modifiedFiles = {};
      }
      modifiedFiles[filePath] = file;
    }
    return modifiedFiles;
  }
  resetFileModifications() {
    this.#modifiedFiles.clear();
  }
  async saveFile(filePath, content) {
    const webcontainer = await this.#webcontainer;
    try {
      const relativePath = path.relative(webcontainer.workdir, filePath);
      if (!relativePath) {
        throw new Error(`EINVAL: invalid file path, write '${relativePath}'`);
      }
      const oldContent = this.getFile(filePath)?.content;
      if (!oldContent && oldContent !== "") {
        unreachable("Expected content to be defined");
      }
      await webcontainer.fs.writeFile(relativePath, content);
      if (!this.#modifiedFiles.has(filePath)) {
        this.#modifiedFiles.set(filePath, oldContent);
      }
      const currentFile = this.files.get()[filePath];
      const isLocked = currentFile?.type === "file" ? currentFile.isLocked : false;
      this.files.setKey(filePath, {
        type: "file",
        content,
        isBinary: false,
        isLocked
      });
      logger.info("File updated");
    } catch (error) {
      logger.error("Failed to update file content\n\n", error);
      throw error;
    }
  }
  async #init() {
    const webcontainer = await this.#webcontainer;
    this.#cleanupDeletedFiles();
    webcontainer.internal.watchPaths(
      { include: [`${WORK_DIR}/**`], exclude: ["**/node_modules", ".git"], includeContent: true },
      bufferWatchEvents(100, this.#processEventBuffer.bind(this))
    );
    const currentChatId = getCurrentChatId();
    migrateLegacyLocks(currentChatId);
    this.#loadLockedFiles(currentChatId);
    setTimeout(() => {
      this.#loadLockedFiles(currentChatId);
    }, 2e3);
    setInterval(() => {
      clearCache();
      const latestChatId = getCurrentChatId();
      this.#loadLockedFiles(latestChatId);
    }, 3e4);
  }
  /**
   * Removes any deleted files/folders from the store
   */
  #cleanupDeletedFiles() {
    if (this.#deletedPaths.size === 0) {
      return;
    }
    const currentFiles = this.files.get();
    const pathsToDelete = /* @__PURE__ */ new Set();
    const deletedPrefixes = [...this.#deletedPaths].map((p) => p + "/");
    for (const [path2, dirent] of Object.entries(currentFiles)) {
      if (!dirent) {
        continue;
      }
      if (this.#deletedPaths.has(path2)) {
        pathsToDelete.add(path2);
        continue;
      }
      for (const prefix of deletedPrefixes) {
        if (path2.startsWith(prefix)) {
          pathsToDelete.add(path2);
          break;
        }
      }
    }
    if (pathsToDelete.size > 0) {
      const updates = {};
      for (const pathToDelete of pathsToDelete) {
        const dirent = currentFiles[pathToDelete];
        updates[pathToDelete] = void 0;
        if (dirent?.type === "file") {
          this.#size--;
          if (this.#modifiedFiles.has(pathToDelete)) {
            this.#modifiedFiles.delete(pathToDelete);
          }
        }
      }
      this.files.set({ ...currentFiles, ...updates });
    }
  }
  #processEventBuffer(events) {
    const watchEvents = events.flat(2);
    for (const { type, path: eventPath, buffer } of watchEvents) {
      const sanitizedPath = eventPath.replace(/\/+$/g, "");
      if (this.#deletedPaths.has(sanitizedPath)) {
        continue;
      }
      let isInDeletedFolder = false;
      for (const deletedPath of this.#deletedPaths) {
        if (sanitizedPath.startsWith(deletedPath + "/")) {
          isInDeletedFolder = true;
          break;
        }
      }
      if (isInDeletedFolder) {
        continue;
      }
      switch (type) {
        case "add_dir": {
          this.files.setKey(sanitizedPath, { type: "folder" });
          break;
        }
        case "remove_dir": {
          this.files.setKey(sanitizedPath, void 0);
          for (const [direntPath] of Object.entries(this.files)) {
            if (direntPath.startsWith(sanitizedPath)) {
              this.files.setKey(direntPath, void 0);
            }
          }
          break;
        }
        case "add_file":
        case "change": {
          if (type === "add_file") {
            this.#size++;
          }
          let content = "";
          const isBinary = isBinaryFile(buffer);
          if (isBinary && buffer) {
            content = Buffer$1.from(buffer).toString("base64");
          } else if (!isBinary) {
            content = this.#decodeFileContent(buffer);
            if (content === " " && type === "add_file") {
              content = "";
            }
          }
          const existingFile = this.files.get()[sanitizedPath];
          if (existingFile?.type === "file" && existingFile.isBinary && existingFile.content && !content) {
            content = existingFile.content;
          }
          const isLocked = existingFile?.type === "file" ? existingFile.isLocked : false;
          this.files.setKey(sanitizedPath, {
            type: "file",
            content,
            isBinary,
            isLocked
          });
          break;
        }
        case "remove_file": {
          this.#size--;
          this.files.setKey(sanitizedPath, void 0);
          break;
        }
      }
    }
  }
  #decodeFileContent(buffer) {
    if (!buffer || buffer.byteLength === 0) {
      return "";
    }
    try {
      return utf8TextDecoder.decode(buffer);
    } catch (error) {
      console.log(error);
      return "";
    }
  }
  async createFile(filePath, content = "") {
    const webcontainer = await this.#webcontainer;
    try {
      const relativePath = path.relative(webcontainer.workdir, filePath);
      if (!relativePath) {
        throw new Error(`EINVAL: invalid file path, create '${relativePath}'`);
      }
      const dirPath = path.dirname(relativePath);
      if (dirPath !== ".") {
        await webcontainer.fs.mkdir(dirPath, { recursive: true });
      }
      const isBinary = content instanceof Uint8Array;
      if (isBinary) {
        await webcontainer.fs.writeFile(relativePath, Buffer$1.from(content));
        const base64Content = Buffer$1.from(content).toString("base64");
        this.files.setKey(filePath, {
          type: "file",
          content: base64Content,
          isBinary: true,
          isLocked: false
        });
        this.#modifiedFiles.set(filePath, base64Content);
      } else {
        const contentToWrite = content.length === 0 ? " " : content;
        await webcontainer.fs.writeFile(relativePath, contentToWrite);
        this.files.setKey(filePath, {
          type: "file",
          content,
          isBinary: false,
          isLocked: false
        });
        this.#modifiedFiles.set(filePath, content);
      }
      logger.info(`File created: ${filePath}`);
      return true;
    } catch (error) {
      logger.error("Failed to create file\n\n", error);
      throw error;
    }
  }
  async createFolder(folderPath) {
    const webcontainer = await this.#webcontainer;
    try {
      const relativePath = path.relative(webcontainer.workdir, folderPath);
      if (!relativePath) {
        throw new Error(`EINVAL: invalid folder path, create '${relativePath}'`);
      }
      await webcontainer.fs.mkdir(relativePath, { recursive: true });
      this.files.setKey(folderPath, { type: "folder" });
      logger.info(`Folder created: ${folderPath}`);
      return true;
    } catch (error) {
      logger.error("Failed to create folder\n\n", error);
      throw error;
    }
  }
  async deleteFile(filePath) {
    const webcontainer = await this.#webcontainer;
    try {
      const relativePath = path.relative(webcontainer.workdir, filePath);
      if (!relativePath) {
        throw new Error(`EINVAL: invalid file path, delete '${relativePath}'`);
      }
      await webcontainer.fs.rm(relativePath);
      this.#deletedPaths.add(filePath);
      this.files.setKey(filePath, void 0);
      this.#size--;
      if (this.#modifiedFiles.has(filePath)) {
        this.#modifiedFiles.delete(filePath);
      }
      this.#persistDeletedPaths();
      logger.info(`File deleted: ${filePath}`);
      return true;
    } catch (error) {
      logger.error("Failed to delete file\n\n", error);
      throw error;
    }
  }
  async deleteFolder(folderPath) {
    const webcontainer = await this.#webcontainer;
    try {
      const relativePath = path.relative(webcontainer.workdir, folderPath);
      if (!relativePath) {
        throw new Error(`EINVAL: invalid folder path, delete '${relativePath}'`);
      }
      await webcontainer.fs.rm(relativePath, { recursive: true });
      this.#deletedPaths.add(folderPath);
      this.files.setKey(folderPath, void 0);
      const allFiles = this.files.get();
      for (const [path2, dirent] of Object.entries(allFiles)) {
        if (path2.startsWith(folderPath + "/")) {
          this.files.setKey(path2, void 0);
          this.#deletedPaths.add(path2);
          if (dirent?.type === "file") {
            this.#size--;
          }
          if (dirent?.type === "file" && this.#modifiedFiles.has(path2)) {
            this.#modifiedFiles.delete(path2);
          }
        }
      }
      this.#persistDeletedPaths();
      logger.info(`Folder deleted: ${folderPath}`);
      return true;
    } catch (error) {
      logger.error("Failed to delete folder\n\n", error);
      throw error;
    }
  }
  // method to persist deleted paths to localStorage
  #persistDeletedPaths() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("bolt-deleted-paths", JSON.stringify([...this.#deletedPaths]));
      }
    } catch (error) {
      logger.error("Failed to persist deleted paths to localStorage", error);
    }
  }
}
function isBinaryFile(buffer) {
  if (buffer === void 0) {
    return false;
  }
  return getEncoding(convertToBuffer(buffer), { chunkLength: 100 }) === "binary";
}
function convertToBuffer(view) {
  return Buffer$1.from(view.buffer, view.byteOffset, view.byteLength);
}

const PREVIEW_CHANNEL = "preview-updates";
class PreviewsStore {
  #availablePreviews = /* @__PURE__ */ new Map();
  #webcontainer;
  #broadcastChannel = null;
  #lastUpdate = /* @__PURE__ */ new Map();
  #watchedFiles = /* @__PURE__ */ new Set();
  #refreshTimeouts = /* @__PURE__ */ new Map();
  #REFRESH_DELAY = 300;
  #storageChannel = null;
  previews = atom([]);
  constructor(webcontainerPromise) {
    this.#webcontainer = webcontainerPromise;
    if (typeof BroadcastChannel !== "undefined") {
      this.#broadcastChannel = new BroadcastChannel(PREVIEW_CHANNEL);
      this.#storageChannel = new BroadcastChannel("storage-sync-channel");
      this.#broadcastChannel.onmessage = (event) => {
        const { type, previewId } = event.data;
        if (type === "file-change") {
          const timestamp = event.data.timestamp;
          const lastUpdate = this.#lastUpdate.get(previewId) || 0;
          if (timestamp > lastUpdate) {
            this.#lastUpdate.set(previewId, timestamp);
            this.refreshPreview(previewId);
          }
        }
      };
      this.#storageChannel.onmessage = (event) => {
        const { storage, source } = event.data;
        if (storage && source !== this._getTabId()) {
          this._syncStorage(storage);
        }
      };
    }
    if (typeof window !== "undefined") {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = (...args) => {
        originalSetItem.apply(localStorage, args);
        this._broadcastStorageSync();
      };
    }
    this.#init();
  }
  // Generate a unique ID for this tab
  _getTabId() {
    if (typeof window !== "undefined") {
      if (!window._tabId) {
        window._tabId = Math.random().toString(36).substring(2, 15);
      }
      return window._tabId;
    }
    return "";
  }
  // Sync storage data between tabs
  _syncStorage(storage) {
    if (typeof window !== "undefined") {
      Object.entries(storage).forEach(([key, value]) => {
        try {
          const originalSetItem = Object.getPrototypeOf(localStorage).setItem;
          originalSetItem.call(localStorage, key, value);
        } catch (error) {
          console.error("[Preview] Error syncing storage:", error);
        }
      });
      const previews = this.previews.get();
      previews.forEach((preview) => {
        const previewId = this.getPreviewId(preview.baseUrl);
        if (previewId) {
          this.refreshPreview(previewId);
        }
      });
      if (typeof window !== "undefined" && window.location) {
        const iframe = document.querySelector("iframe");
        if (iframe) {
          iframe.src = iframe.src;
        }
      }
    }
  }
  // Broadcast storage state to other tabs
  _broadcastStorageSync() {
    if (typeof window !== "undefined") {
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          storage[key] = localStorage.getItem(key) || "";
        }
      }
      this.#storageChannel?.postMessage({
        type: "storage-sync",
        storage,
        source: this._getTabId(),
        timestamp: Date.now()
      });
    }
  }
  async #init() {
    const webcontainer = await this.#webcontainer;
    webcontainer.on("server-ready", (port, url) => {
      console.log("[Preview] Server ready on port:", port, url);
      this.broadcastUpdate(url);
      this._broadcastStorageSync();
    });
    try {
      webcontainer.internal.watchPaths(
        {
          // Only watch specific file types that affect the preview
          include: ["**/*.html", "**/*.css", "**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx", "**/*.json"],
          exclude: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/coverage/**"]
        },
        async (_events) => {
          const previews = this.previews.get();
          for (const preview of previews) {
            const previewId = this.getPreviewId(preview.baseUrl);
            if (previewId) {
              this.broadcastFileChange(previewId);
            }
          }
        }
      );
      if (typeof window !== "undefined") {
        const observer = new MutationObserver((_mutations) => {
          this._broadcastStorageSync();
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true
        });
      }
    } catch (error) {
      console.error("[Preview] Error setting up watchers:", error);
    }
    webcontainer.on("port", (port, type, url) => {
      let previewInfo = this.#availablePreviews.get(port);
      if (type === "close" && previewInfo) {
        this.#availablePreviews.delete(port);
        this.previews.set(this.previews.get().filter((preview) => preview.port !== port));
        return;
      }
      const previews = this.previews.get();
      if (!previewInfo) {
        previewInfo = { port, ready: type === "open", baseUrl: url };
        this.#availablePreviews.set(port, previewInfo);
        previews.push(previewInfo);
      }
      previewInfo.ready = type === "open";
      previewInfo.baseUrl = url;
      this.previews.set([...previews]);
      if (type === "open") {
        this.broadcastUpdate(url);
      }
    });
  }
  // Helper to extract preview ID from URL
  getPreviewId(url) {
    const match = url.match(/^https?:\/\/([^.]+)\.local-credentialless\.webcontainer-api\.io/);
    return match ? match[1] : null;
  }
  // Broadcast state change to all tabs
  broadcastStateChange(previewId) {
    const timestamp = Date.now();
    this.#lastUpdate.set(previewId, timestamp);
    this.#broadcastChannel?.postMessage({
      type: "state-change",
      previewId,
      timestamp
    });
  }
  // Broadcast file change to all tabs
  broadcastFileChange(previewId) {
    const timestamp = Date.now();
    this.#lastUpdate.set(previewId, timestamp);
    this.#broadcastChannel?.postMessage({
      type: "file-change",
      previewId,
      timestamp
    });
  }
  // Broadcast update to all tabs
  broadcastUpdate(url) {
    const previewId = this.getPreviewId(url);
    if (previewId) {
      const timestamp = Date.now();
      this.#lastUpdate.set(previewId, timestamp);
      this.#broadcastChannel?.postMessage({
        type: "file-change",
        previewId,
        timestamp
      });
    }
  }
  // Method to refresh a specific preview
  refreshPreview(previewId) {
    const existingTimeout = this.#refreshTimeouts.get(previewId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    const timeout = setTimeout(() => {
      const previews = this.previews.get();
      const preview = previews.find((p) => this.getPreviewId(p.baseUrl) === previewId);
      if (preview) {
        preview.ready = false;
        this.previews.set([...previews]);
        requestAnimationFrame(() => {
          preview.ready = true;
          this.previews.set([...previews]);
        });
      }
      this.#refreshTimeouts.delete(previewId);
    }, this.#REFRESH_DELAY);
    this.#refreshTimeouts.set(previewId, timeout);
  }
  refreshAllPreviews() {
    const previews = this.previews.get();
    for (const preview of previews) {
      const previewId = this.getPreviewId(preview.baseUrl);
      if (previewId) {
        this.broadcastFileChange(previewId);
      }
    }
  }
}

function withResolvers() {
  if (typeof Promise.withResolvers === "function") {
    return Promise.withResolvers();
  }
  let resolve;
  let reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {
    resolve,
    reject,
    promise
  };
}

const expoUrlAtom = atom(null);

async function newShellProcess(webcontainer, terminal) {
  const args = [];
  const process = await webcontainer.spawn("/bin/jsh", ["--osc", ...args], {
    terminal: {
      cols: terminal.cols ?? 80,
      rows: terminal.rows ?? 15
    }
  });
  const input = process.input.getWriter();
  const output = process.output;
  const jshReady = withResolvers();
  let isInteractive = false;
  output.pipeTo(
    new WritableStream({
      write(data) {
        if (!isInteractive) {
          const [, osc] = data.match(/\x1b\]654;([^\x07]+)\x07/) || [];
          if (osc === "interactive") {
            isInteractive = true;
            jshReady.resolve();
          }
        }
        terminal.write(data);
      }
    })
  );
  terminal.onData((data) => {
    if (isInteractive) {
      input.write(data);
    }
  });
  await jshReady.promise;
  return process;
}
class BoltShell {
  #initialized;
  #readyPromise;
  #webcontainer;
  #terminal;
  #process;
  executionState = atom();
  #outputStream;
  #shellInputStream;
  constructor() {
    this.#readyPromise = new Promise((resolve) => {
      this.#initialized = resolve;
    });
  }
  ready() {
    return this.#readyPromise;
  }
  async init(webcontainer, terminal) {
    this.#webcontainer = webcontainer;
    this.#terminal = terminal;
    const { process, commandStream, expoUrlStream } = await this.newBoltShellProcess(webcontainer, terminal);
    this.#process = process;
    this.#outputStream = commandStream.getReader();
    this._watchExpoUrlInBackground(expoUrlStream);
    await this.waitTillOscCode("interactive");
    this.#initialized?.();
  }
  async newBoltShellProcess(webcontainer, terminal) {
    const args = [];
    const process = await webcontainer.spawn("/bin/jsh", ["--osc", ...args], {
      terminal: {
        cols: terminal.cols ?? 80,
        rows: terminal.rows ?? 15
      }
    });
    const input = process.input.getWriter();
    this.#shellInputStream = input;
    const [streamA, streamB] = process.output.tee();
    const [streamC, streamD] = streamB.tee();
    const jshReady = withResolvers();
    let isInteractive = false;
    streamA.pipeTo(
      new WritableStream({
        write(data) {
          if (!isInteractive) {
            const [, osc] = data.match(/\x1b\]654;([^\x07]+)\x07/) || [];
            if (osc === "interactive") {
              isInteractive = true;
              jshReady.resolve();
            }
          }
          terminal.write(data);
        }
      })
    );
    terminal.onData((data) => {
      if (isInteractive) {
        input.write(data);
      }
    });
    await jshReady.promise;
    return { process, terminalStream: streamA, commandStream: streamC, expoUrlStream: streamD };
  }
  // Dedicated background watcher for Expo URL
  async _watchExpoUrlInBackground(stream) {
    const reader = stream.getReader();
    let buffer = "";
    const expoUrlRegex = /(exp:\/\/[^\s]+)/;
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += value || "";
      const expoUrlMatch = buffer.match(expoUrlRegex);
      if (expoUrlMatch) {
        const cleanUrl = expoUrlMatch[1].replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "").replace(/[^\x20-\x7E]+$/g, "");
        expoUrlAtom.set(cleanUrl);
        buffer = buffer.slice(buffer.indexOf(expoUrlMatch[1]) + expoUrlMatch[1].length);
      }
      if (buffer.length > 2048) {
        buffer = buffer.slice(-2048);
      }
    }
  }
  get terminal() {
    return this.#terminal;
  }
  get process() {
    return this.#process;
  }
  async executeCommand(sessionId, command, abort) {
    if (!this.process || !this.terminal) {
      return void 0;
    }
    const state = this.executionState.get();
    if (state?.active && state.abort) {
      state.abort();
    }
    this.terminal.input("");
    await this.waitTillOscCode("prompt");
    if (state && state.executionPrms) {
      await state.executionPrms;
    }
    this.terminal.input(command.trim() + "\n");
    const executionPromise = this.getCurrentExecutionResult();
    this.executionState.set({ sessionId, active: true, executionPrms: executionPromise, abort });
    const resp = await executionPromise;
    this.executionState.set({ sessionId, active: false });
    if (resp) {
      try {
        resp.output = cleanTerminalOutput(resp.output);
      } catch (error) {
        console.log("failed to format terminal output", error);
      }
    }
    return resp;
  }
  async getCurrentExecutionResult() {
    const { output, exitCode } = await this.waitTillOscCode("exit");
    return { output, exitCode };
  }
  onQRCodeDetected;
  async waitTillOscCode(waitCode) {
    let fullOutput = "";
    let exitCode = 0;
    let buffer = "";
    if (!this.#outputStream) {
      return { output: fullOutput, exitCode };
    }
    const tappedStream = this.#outputStream;
    const expoUrlRegex = /(exp:\/\/[^\s]+)/;
    while (true) {
      const { value, done } = await tappedStream.read();
      if (done) {
        break;
      }
      const text = value || "";
      fullOutput += text;
      buffer += text;
      const expoUrlMatch = buffer.match(expoUrlRegex);
      if (expoUrlMatch) {
        const cleanUrl = expoUrlMatch[1].replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "").replace(/[^\x20-\x7E]+$/g, "");
        expoUrlAtom.set(cleanUrl);
        buffer = buffer.slice(buffer.indexOf(expoUrlMatch[1]) + expoUrlMatch[1].length);
      }
      const [, osc, , , code] = text.match(/\x1b\]654;([^\x07=]+)=?((-?\d+):(\d+))?\x07/) || [];
      if (osc === "exit") {
        exitCode = parseInt(code, 10);
      }
      if (osc === waitCode) {
        break;
      }
    }
    return { output: fullOutput, exitCode };
  }
}
function cleanTerminalOutput(input) {
  const removeOsc = input.replace(/\x1b\](\d+;[^\x07\x1b]*|\d+[^\x07\x1b]*)\x07/g, "").replace(/\](\d+;[^\n]*|\d+[^\n]*)/g, "");
  const removeAnsi = removeOsc.replace(/\u001b\[[\?]?[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\[[\?]?[0-9;]*[a-zA-Z]/g, "").replace(/\u001b\[[0-9;]*m/g, "").replace(/\x1b\[[0-9;]*m/g, "").replace(/\u001b/g, "").replace(/\x1b/g, "");
  const cleanNewlines = removeAnsi.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n");
  const formatOutput = cleanNewlines.replace(/^([~\/][^\n❯]+)❯/m, "$1\n❯").replace(/(?<!^|\n)>/g, "\n>").replace(/(?<!^|\n|\w)(error|failed|warning|Error|Failed|Warning):/g, "\n$1:").replace(/(?<!^|\n|\/)(at\s+(?!async|sync))/g, "\nat ").replace(/\bat\s+async/g, "at async").replace(/(?<!^|\n)(npm ERR!)/g, "\n$1");
  const cleanSpaces = formatOutput.split("\n").map((line) => line.trim()).filter((line) => line.length > 0).join("\n");
  return cleanSpaces.replace(/\n{3,}/g, "\n\n").replace(/:\s+/g, ": ").replace(/\s{2,}/g, " ").replace(/^\s+|\s+$/g, "").replace(/\u0000/g, "");
}
function newBoltShellProcess() {
  return new BoltShell();
}

const reset = "\x1B[0m";
const escapeCodes = {
  red: "\x1B[1;31m"
};
const coloredText = {
  red: (text) => `${escapeCodes.red}${text}${reset}`
};

class TerminalStore {
  #webcontainer;
  #terminals = [];
  #boltTerminal = newBoltShellProcess();
  showTerminal = atom(true);
  constructor(webcontainerPromise) {
    this.#webcontainer = webcontainerPromise;
  }
  get boltTerminal() {
    return this.#boltTerminal;
  }
  toggleTerminal(value) {
    this.showTerminal.set(value !== void 0 ? value : !this.showTerminal.get());
  }
  async attachBoltTerminal(terminal) {
    try {
      const wc = await this.#webcontainer;
      await this.#boltTerminal.init(wc, terminal);
    } catch (error) {
      terminal.write(coloredText.red("Failed to spawn bolt shell\n\n") + error.message);
      return;
    }
  }
  async attachTerminal(terminal) {
    try {
      const shellProcess = await newShellProcess(await this.#webcontainer, terminal);
      this.#terminals.push({ terminal, process: shellProcess });
    } catch (error) {
      terminal.write(coloredText.red("Failed to spawn shell\n\n") + error.message);
      return;
    }
  }
  onTerminalResize(cols, rows) {
    for (const { process } of this.#terminals) {
      process.resize({ cols, rows });
    }
  }
}

function createSampler(fn, sampleInterval) {
  let lastArgs = null;
  let lastTime = 0;
  let timeout = null;
  const sampled = function(...args) {
    const now = Date.now();
    lastArgs = args;
    if (now - lastTime < sampleInterval) {
      if (!timeout) {
        timeout = setTimeout(
          () => {
            timeout = null;
            lastTime = Date.now();
            if (lastArgs) {
              fn.apply(this, lastArgs);
              lastArgs = null;
            }
          },
          sampleInterval - (now - lastTime)
        );
      }
      return;
    }
    lastTime = now;
    fn.apply(this, args);
    lastArgs = null;
  };
  return sampled;
}

const { saveAs } = fileSaver;
class WorkbenchStore {
  #previewsStore = new PreviewsStore(webcontainer);
  #filesStore = new FilesStore(webcontainer);
  #editorStore = new EditorStore(this.#filesStore);
  #terminalStore = new TerminalStore(webcontainer);
  #reloadedMessages = /* @__PURE__ */ new Set();
  artifacts = map({});
  showWorkbench = atom(false);
  currentView = atom("code");
  unsavedFiles = atom(/* @__PURE__ */ new Set());
  actionAlert = atom(void 0);
  supabaseAlert = atom(void 0);
  deployAlert = atom(void 0);
  modifiedFiles = /* @__PURE__ */ new Set();
  artifactIdList = [];
  #globalExecutionQueue = Promise.resolve();
  constructor() {
  }
  addToExecutionQueue(callback) {
    this.#globalExecutionQueue = this.#globalExecutionQueue.then(() => callback());
  }
  get previews() {
    return this.#previewsStore.previews;
  }
  get files() {
    return this.#filesStore.files;
  }
  get currentDocument() {
    return this.#editorStore.currentDocument;
  }
  get selectedFile() {
    return this.#editorStore.selectedFile;
  }
  get firstArtifact() {
    return this.#getArtifact(this.artifactIdList[0]);
  }
  get filesCount() {
    return this.#filesStore.filesCount;
  }
  get showTerminal() {
    return this.#terminalStore.showTerminal;
  }
  get boltTerminal() {
    return this.#terminalStore.boltTerminal;
  }
  get alert() {
    return this.actionAlert;
  }
  clearAlert() {
    this.actionAlert.set(void 0);
  }
  get SupabaseAlert() {
    return this.supabaseAlert;
  }
  clearSupabaseAlert() {
    this.supabaseAlert.set(void 0);
  }
  get DeployAlert() {
    return this.deployAlert;
  }
  clearDeployAlert() {
    this.deployAlert.set(void 0);
  }
  toggleTerminal(value) {
    this.#terminalStore.toggleTerminal(value);
  }
  attachTerminal(terminal) {
    this.#terminalStore.attachTerminal(terminal);
  }
  attachBoltTerminal(terminal) {
    this.#terminalStore.attachBoltTerminal(terminal);
  }
  onTerminalResize(cols, rows) {
    this.#terminalStore.onTerminalResize(cols, rows);
  }
  setDocuments(files) {
    this.#editorStore.setDocuments(files);
    if (this.#filesStore.filesCount > 0 && this.currentDocument.get() === void 0) {
      for (const [filePath, dirent] of Object.entries(files)) {
        if (dirent?.type === "file") {
          this.setSelectedFile(filePath);
          break;
        }
      }
    }
  }
  setShowWorkbench(show) {
    this.showWorkbench.set(show);
  }
  setCurrentDocumentContent(newContent) {
    const filePath = this.currentDocument.get()?.filePath;
    if (!filePath) {
      return;
    }
    const originalContent = this.#filesStore.getFile(filePath)?.content;
    const unsavedChanges = originalContent !== void 0 && originalContent !== newContent;
    this.#editorStore.updateFile(filePath, newContent);
    const currentDocument = this.currentDocument.get();
    if (currentDocument) {
      const previousUnsavedFiles = this.unsavedFiles.get();
      if (unsavedChanges && previousUnsavedFiles.has(currentDocument.filePath)) {
        return;
      }
      const newUnsavedFiles = new Set(previousUnsavedFiles);
      if (unsavedChanges) {
        newUnsavedFiles.add(currentDocument.filePath);
      } else {
        newUnsavedFiles.delete(currentDocument.filePath);
      }
      this.unsavedFiles.set(newUnsavedFiles);
    }
  }
  setCurrentDocumentScrollPosition(position) {
    const editorDocument = this.currentDocument.get();
    if (!editorDocument) {
      return;
    }
    const { filePath } = editorDocument;
    this.#editorStore.updateScrollPosition(filePath, position);
  }
  setSelectedFile(filePath) {
    this.#editorStore.setSelectedFile(filePath);
  }
  async saveFile(filePath) {
    const documents = this.#editorStore.documents.get();
    const document = documents[filePath];
    if (document === void 0) {
      return;
    }
    await this.#filesStore.saveFile(filePath, document.value);
    const newUnsavedFiles = new Set(this.unsavedFiles.get());
    newUnsavedFiles.delete(filePath);
    this.unsavedFiles.set(newUnsavedFiles);
  }
  async saveCurrentDocument() {
    const currentDocument = this.currentDocument.get();
    if (currentDocument === void 0) {
      return;
    }
    await this.saveFile(currentDocument.filePath);
  }
  resetCurrentDocument() {
    const currentDocument = this.currentDocument.get();
    if (currentDocument === void 0) {
      return;
    }
    const { filePath } = currentDocument;
    const file = this.#filesStore.getFile(filePath);
    if (!file) {
      return;
    }
    this.setCurrentDocumentContent(file.content);
  }
  async saveAllFiles() {
    for (const filePath of this.unsavedFiles.get()) {
      await this.saveFile(filePath);
    }
  }
  getFileModifcations() {
    return this.#filesStore.getFileModifications();
  }
  getModifiedFiles() {
    return this.#filesStore.getModifiedFiles();
  }
  resetAllFileModifications() {
    this.#filesStore.resetFileModifications();
  }
  /**
   * Lock a file to prevent edits
   * @param filePath Path to the file to lock
   * @returns True if the file was successfully locked
   */
  lockFile(filePath) {
    return this.#filesStore.lockFile(filePath);
  }
  /**
   * Lock a folder and all its contents to prevent edits
   * @param folderPath Path to the folder to lock
   * @returns True if the folder was successfully locked
   */
  lockFolder(folderPath) {
    return this.#filesStore.lockFolder(folderPath);
  }
  /**
   * Unlock a file to allow edits
   * @param filePath Path to the file to unlock
   * @returns True if the file was successfully unlocked
   */
  unlockFile(filePath) {
    return this.#filesStore.unlockFile(filePath);
  }
  /**
   * Unlock a folder and all its contents to allow edits
   * @param folderPath Path to the folder to unlock
   * @returns True if the folder was successfully unlocked
   */
  unlockFolder(folderPath) {
    return this.#filesStore.unlockFolder(folderPath);
  }
  /**
   * Check if a file is locked
   * @param filePath Path to the file to check
   * @returns Object with locked status, lock mode, and what caused the lock
   */
  isFileLocked(filePath) {
    return this.#filesStore.isFileLocked(filePath);
  }
  /**
   * Check if a folder is locked
   * @param folderPath Path to the folder to check
   * @returns Object with locked status, lock mode, and what caused the lock
   */
  isFolderLocked(folderPath) {
    return this.#filesStore.isFolderLocked(folderPath);
  }
  async createFile(filePath, content = "") {
    try {
      const success = await this.#filesStore.createFile(filePath, content);
      if (success) {
        this.setSelectedFile(filePath);
        if (typeof content === "string" && content === "") {
          const newUnsavedFiles = new Set(this.unsavedFiles.get());
          newUnsavedFiles.delete(filePath);
          this.unsavedFiles.set(newUnsavedFiles);
        }
      }
      return success;
    } catch (error) {
      console.error("Failed to create file:", error);
      throw error;
    }
  }
  async createFolder(folderPath) {
    try {
      return await this.#filesStore.createFolder(folderPath);
    } catch (error) {
      console.error("Failed to create folder:", error);
      throw error;
    }
  }
  async deleteFile(filePath) {
    try {
      const currentDocument = this.currentDocument.get();
      const isCurrentFile = currentDocument?.filePath === filePath;
      const success = await this.#filesStore.deleteFile(filePath);
      if (success) {
        const newUnsavedFiles = new Set(this.unsavedFiles.get());
        if (newUnsavedFiles.has(filePath)) {
          newUnsavedFiles.delete(filePath);
          this.unsavedFiles.set(newUnsavedFiles);
        }
        if (isCurrentFile) {
          const files = this.files.get();
          let nextFile = void 0;
          for (const [path2, dirent] of Object.entries(files)) {
            if (dirent?.type === "file") {
              nextFile = path2;
              break;
            }
          }
          this.setSelectedFile(nextFile);
        }
      }
      return success;
    } catch (error) {
      console.error("Failed to delete file:", error);
      throw error;
    }
  }
  async deleteFolder(folderPath) {
    try {
      const currentDocument = this.currentDocument.get();
      const isInCurrentFolder = currentDocument?.filePath?.startsWith(folderPath + "/");
      const success = await this.#filesStore.deleteFolder(folderPath);
      if (success) {
        const unsavedFiles = this.unsavedFiles.get();
        const newUnsavedFiles = /* @__PURE__ */ new Set();
        for (const file of unsavedFiles) {
          if (!file.startsWith(folderPath + "/")) {
            newUnsavedFiles.add(file);
          }
        }
        if (newUnsavedFiles.size !== unsavedFiles.size) {
          this.unsavedFiles.set(newUnsavedFiles);
        }
        if (isInCurrentFolder) {
          const files = this.files.get();
          let nextFile = void 0;
          for (const [path2, dirent] of Object.entries(files)) {
            if (dirent?.type === "file") {
              nextFile = path2;
              break;
            }
          }
          this.setSelectedFile(nextFile);
        }
      }
      return success;
    } catch (error) {
      console.error("Failed to delete folder:", error);
      throw error;
    }
  }
  abortAllActions() {
  }
  setReloadedMessages(messages) {
    this.#reloadedMessages = new Set(messages);
  }
  addArtifact({ messageId, title, id, type }) {
    const artifact = this.#getArtifact(messageId);
    if (artifact) {
      return;
    }
    if (!this.artifactIdList.includes(messageId)) {
      this.artifactIdList.push(messageId);
    }
    this.artifacts.setKey(messageId, {
      id,
      title,
      closed: false,
      type,
      runner: new ActionRunner(
        webcontainer,
        () => this.boltTerminal,
        (alert) => {
          if (this.#reloadedMessages.has(messageId)) {
            return;
          }
          this.actionAlert.set(alert);
        },
        (alert) => {
          if (this.#reloadedMessages.has(messageId)) {
            return;
          }
          this.supabaseAlert.set(alert);
        },
        (alert) => {
          if (this.#reloadedMessages.has(messageId)) {
            return;
          }
          this.deployAlert.set(alert);
        }
      )
    });
  }
  updateArtifact({ messageId }, state) {
    const artifact = this.#getArtifact(messageId);
    if (!artifact) {
      return;
    }
    this.artifacts.setKey(messageId, { ...artifact, ...state });
  }
  addAction(data) {
    this.addToExecutionQueue(() => this._addAction(data));
  }
  async _addAction(data) {
    const { messageId } = data;
    const artifact = this.#getArtifact(messageId);
    if (!artifact) {
      unreachable("Artifact not found");
    }
    return artifact.runner.addAction(data);
  }
  runAction(data, isStreaming = false) {
    if (isStreaming) {
      this.actionStreamSampler(data, isStreaming);
    } else {
      this.addToExecutionQueue(() => this._runAction(data, isStreaming));
    }
  }
  async _runAction(data, isStreaming = false) {
    const { messageId } = data;
    const artifact = this.#getArtifact(messageId);
    if (!artifact) {
      unreachable("Artifact not found");
    }
    const action = artifact.runner.actions.get()[data.actionId];
    if (!action || action.executed) {
      return;
    }
    if (data.action.type === "file") {
      const wc = await webcontainer;
      const fullPath = path.join(wc.workdir, data.action.filePath);
      if (this.selectedFile.value !== fullPath) {
        this.setSelectedFile(fullPath);
      }
      if (this.currentView.value !== "code") {
        this.currentView.set("code");
      }
      const doc = this.#editorStore.documents.get()[fullPath];
      if (!doc) {
        await artifact.runner.runAction(data, isStreaming);
      }
      this.#editorStore.updateFile(fullPath, data.action.content);
      if (!isStreaming && data.action.content) {
        await this.saveFile(fullPath);
      }
      if (!isStreaming) {
        await artifact.runner.runAction(data);
        this.resetAllFileModifications();
      }
    } else {
      await artifact.runner.runAction(data);
    }
  }
  actionStreamSampler = createSampler(async (data, isStreaming = false) => {
    return await this._runAction(data, isStreaming);
  }, 100);
  // TODO: remove this magic number to have it configurable
  #getArtifact(id) {
    const artifacts = this.artifacts.get();
    return artifacts[id];
  }
  async downloadZip() {
    const zip = new JSZip();
    const files = this.files.get();
    const projectName = (description.value ?? "project").toLocaleLowerCase().split(" ").join("_");
    const timestampHash = Date.now().toString(36).slice(-6);
    const uniqueProjectName = `${projectName}_${timestampHash}`;
    for (const [filePath, dirent] of Object.entries(files)) {
      if (dirent?.type === "file" && !dirent.isBinary) {
        const relativePath = extractRelativePath(filePath);
        const pathSegments = relativePath.split("/");
        if (pathSegments.length > 1) {
          let currentFolder = zip;
          for (let i = 0; i < pathSegments.length - 1; i++) {
            currentFolder = currentFolder.folder(pathSegments[i]);
          }
          currentFolder.file(pathSegments[pathSegments.length - 1], dirent.content);
        } else {
          zip.file(relativePath, dirent.content);
        }
      }
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${uniqueProjectName}.zip`);
  }
  async syncFiles(targetHandle) {
    const files = this.files.get();
    const syncedFiles = [];
    for (const [filePath, dirent] of Object.entries(files)) {
      if (dirent?.type === "file" && !dirent.isBinary) {
        const relativePath = extractRelativePath(filePath);
        const pathSegments = relativePath.split("/");
        let currentHandle = targetHandle;
        for (let i = 0; i < pathSegments.length - 1; i++) {
          currentHandle = await currentHandle.getDirectoryHandle(pathSegments[i], { create: true });
        }
        const fileHandle = await currentHandle.getFileHandle(pathSegments[pathSegments.length - 1], {
          create: true
        });
        const writable = await fileHandle.createWritable();
        await writable.write(dirent.content);
        await writable.close();
        syncedFiles.push(relativePath);
      }
    }
    return syncedFiles;
  }
  async pushToGitHub(repoName, commitMessage, githubUsername, ghToken, isPrivate = false) {
    try {
      const githubToken = ghToken || Cookies.get("githubToken");
      const owner = githubUsername || Cookies.get("githubUsername");
      if (!githubToken || !owner) {
        throw new Error("GitHub token or username is not set in cookies or provided.");
      }
      console.log(`pushToGitHub called with isPrivate=${isPrivate}`);
      const octokit = new Octokit({ auth: githubToken });
      let repo;
      let visibilityJustChanged = false;
      try {
        const resp = await octokit.repos.get({ owner, repo: repoName });
        repo = resp.data;
        console.log("Repository already exists, using existing repo");
        if (repo.private !== isPrivate) {
          console.log(
            `Updating repository visibility from ${repo.private ? "private" : "public"} to ${isPrivate ? "private" : "public"}`
          );
          try {
            const { data: updatedRepo } = await octokit.repos.update({
              owner,
              repo: repoName,
              private: isPrivate
            });
            console.log("Repository visibility updated successfully");
            repo = updatedRepo;
            visibilityJustChanged = true;
            console.log("Waiting for visibility change to propagate...");
            await new Promise((resolve) => setTimeout(resolve, 3e3));
          } catch (visibilityError) {
            console.error("Failed to update repository visibility:", visibilityError);
          }
        }
      } catch (error) {
        if (error instanceof Error && "status" in error && error.status === 404) {
          console.log(`Creating new repository with private=${isPrivate}`);
          const createRepoOptions = {
            name: repoName,
            private: isPrivate,
            auto_init: true
          };
          console.log("Create repo options:", createRepoOptions);
          const { data: newRepo } = await octokit.repos.createForAuthenticatedUser(createRepoOptions);
          console.log("Repository created:", newRepo.html_url, "Private:", newRepo.private);
          repo = newRepo;
          console.log("Waiting for repository to initialize...");
          await new Promise((resolve) => setTimeout(resolve, 2e3));
        } else {
          console.error("Cannot create repo:", error);
          throw error;
        }
      }
      const files = this.files.get();
      if (!files || Object.keys(files).length === 0) {
        throw new Error("No files found to push");
      }
      const pushFilesToRepo = async (attempt = 1) => {
        const maxAttempts = 3;
        try {
          console.log(`Pushing files to repository (attempt ${attempt}/${maxAttempts})...`);
          const blobs = await Promise.all(
            Object.entries(files).map(async ([filePath, dirent]) => {
              if (dirent?.type === "file" && dirent.content) {
                const { data: blob } = await octokit.git.createBlob({
                  owner: repo.owner.login,
                  repo: repo.name,
                  content: Buffer.from(dirent.content).toString("base64"),
                  encoding: "base64"
                });
                return { path: extractRelativePath(filePath), sha: blob.sha };
              }
              return null;
            })
          );
          const validBlobs = blobs.filter(Boolean);
          if (validBlobs.length === 0) {
            throw new Error("No valid files to push");
          }
          const repoRefresh = await octokit.repos.get({ owner, repo: repoName });
          repo = repoRefresh.data;
          const { data: ref } = await octokit.git.getRef({
            owner: repo.owner.login,
            repo: repo.name,
            ref: `heads/${repo.default_branch || "main"}`
            // Handle dynamic branch
          });
          const latestCommitSha = ref.object.sha;
          const { data: newTree } = await octokit.git.createTree({
            owner: repo.owner.login,
            repo: repo.name,
            base_tree: latestCommitSha,
            tree: validBlobs.map((blob) => ({
              path: blob.path,
              mode: "100644",
              type: "blob",
              sha: blob.sha
            }))
          });
          const { data: newCommit } = await octokit.git.createCommit({
            owner: repo.owner.login,
            repo: repo.name,
            message: commitMessage || "Initial commit from your app",
            tree: newTree.sha,
            parents: [latestCommitSha]
          });
          await octokit.git.updateRef({
            owner: repo.owner.login,
            repo: repo.name,
            ref: `heads/${repo.default_branch || "main"}`,
            // Handle dynamic branch
            sha: newCommit.sha
          });
          console.log("Files successfully pushed to repository");
          return repo.html_url;
        } catch (error) {
          console.error(`Error during push attempt ${attempt}:`, error);
          if ((visibilityJustChanged || attempt === 1) && attempt < maxAttempts) {
            const delayMs = attempt * 2e3;
            console.log(`Waiting ${delayMs}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return pushFilesToRepo(attempt + 1);
          }
          throw error;
        }
      };
      const repoUrl = await pushFilesToRepo();
      return repoUrl;
    } catch (error) {
      console.error("Error pushing to GitHub:", error);
      throw error;
    }
  }
}
const workbenchStore = new WorkbenchStore();

await openDatabase() ;
const chatId = atom(void 0);
const description = atom(void 0);
atom(void 0);

const badgeVariants = cva(
  "inline-flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-bolt-elements-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-bolt-elements-background text-bolt-elements-textPrimary hover:bg-bolt-elements-background/80",
        secondary: "border-transparent bg-bolt-elements-background text-bolt-elements-textSecondary hover:bg-bolt-elements-background/80",
        destructive: "border-transparent bg-red-500/10 text-red-500 hover:bg-red-500/20",
        outline: "text-bolt-elements-textPrimary",
        primary: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
        success: "bg-green-500/10 text-green-600 dark:text-green-400",
        warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
        danger: "bg-red-500/10 text-red-600 dark:text-red-400",
        info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        subtle: "border border-bolt-elements-borderColor/30 dark:border-bolt-elements-borderColor-dark/30 bg-white/50 dark:bg-bolt-elements-background-depth-4/50 backdrop-blur-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark"
      },
      size: {
        default: "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        sm: "rounded-full px-1.5 py-0.5 text-xs",
        md: "rounded-md px-2 py-1 text-xs font-medium",
        lg: "rounded-md px-2.5 py-1.5 text-sm"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function Badge({ className, variant, size, icon, children, ...props }) {
  return /* @__PURE__ */ jsxs("div", { className: classNames(badgeVariants({ variant, size }), className), ...props, children: [
    icon && /* @__PURE__ */ jsx("span", { className: icon }),
    children
  ] });
}

const cubicEasingFn = cubicBezier(0.4, 0, 0.2, 1);

const DialogButton = memo(({ type, children, onClick, disabled }) => {
  return /* @__PURE__ */ jsx(
    "button",
    {
      className: classNames(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
        type === "primary" ? "bg-purple-500 text-white hover:bg-purple-600 dark:bg-purple-500 dark:hover:bg-purple-600" : type === "secondary" ? "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100" : "bg-transparent text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
      ),
      onClick,
      disabled,
      children
    }
  );
});
const DialogTitle = memo(({ className, children, ...props }) => {
  return /* @__PURE__ */ jsx(
    Dialog$1.Title,
    {
      className: classNames("text-lg font-medium text-bolt-elements-textPrimary flex items-center gap-2", className),
      ...props,
      children
    }
  );
});
const DialogDescription = memo(({ className, children, ...props }) => {
  return /* @__PURE__ */ jsx(
    Dialog$1.Description,
    {
      className: classNames("text-sm text-bolt-elements-textSecondary mt-1", className),
      ...props,
      children
    }
  );
});
const transition = {
  duration: 0.15,
  ease: cubicEasingFn
};
const dialogBackdropVariants = {
  closed: {
    opacity: 0,
    transition
  },
  open: {
    opacity: 1,
    transition
  }
};
const dialogVariants = {
  closed: {
    x: "-50%",
    y: "-40%",
    scale: 0.96,
    opacity: 0,
    transition
  },
  open: {
    x: "-50%",
    y: "-50%",
    scale: 1,
    opacity: 1,
    transition
  }
};
const Dialog = memo(({ children, className, showCloseButton = true, onClose, onBackdrop }) => {
  return /* @__PURE__ */ jsxs(Dialog$1.Portal, { children: [
    /* @__PURE__ */ jsx(Dialog$1.Overlay, { asChild: true, children: /* @__PURE__ */ jsx(
      motion.div,
      {
        className: classNames("fixed inset-0 z-[9999] bg-black/70 dark:bg-black/80 backdrop-blur-sm"),
        initial: "closed",
        animate: "open",
        exit: "closed",
        variants: dialogBackdropVariants,
        onClick: onBackdrop
      }
    ) }),
    /* @__PURE__ */ jsx(Dialog$1.Content, { asChild: true, children: /* @__PURE__ */ jsx(
      motion.div,
      {
        className: classNames(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-950 rounded-lg shadow-xl border border-bolt-elements-borderColor z-[9999] w-[520px] focus:outline-none",
          className
        ),
        initial: "closed",
        animate: "open",
        exit: "closed",
        variants: dialogVariants,
        children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
          children,
          showCloseButton && /* @__PURE__ */ jsx(Dialog$1.Close, { asChild: true, onClick: onClose, children: /* @__PURE__ */ jsx(
            IconButton,
            {
              icon: "i-ph:x",
              className: "absolute top-3 right-3 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary"
            }
          ) })
        ] })
      }
    ) })
  ] });
});

const Input = forwardRef(({ className, type, ...props }, ref) => {
  return /* @__PURE__ */ jsx(
    "input",
    {
      type,
      className: classNames(
        "flex h-10 w-full rounded-md border border-bolt-elements-border bg-bolt-elements-background px-3 py-2 text-sm ring-offset-bolt-elements-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-bolt-elements-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bolt-elements-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ref,
      ...props
    }
  );
});
Input.displayName = "Input";

const VARIANT_STYLES = {
  default: {
    container: "py-8 p-6",
    icon: {
      container: "w-12 h-12 mb-3",
      size: "w-6 h-6"
    },
    title: "text-base",
    description: "text-sm mt-1",
    actions: "mt-4",
    buttonSize: "default"
  },
  compact: {
    container: "py-4 p-4",
    icon: {
      container: "w-10 h-10 mb-2",
      size: "w-5 h-5"
    },
    title: "text-sm",
    description: "text-xs mt-0.5",
    actions: "mt-3",
    buttonSize: "sm"
  }
};
function EmptyState({
  icon = "i-ph:folder-simple-dashed",
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  variant = "default"
}) {
  const styles = VARIANT_STYLES[variant];
  const buttonAnimation = {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 }
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: classNames(
        "flex flex-col items-center justify-center",
        "text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark",
        "bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-3 rounded-lg",
        styles.container,
        className
      ),
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: classNames(
              "rounded-full bg-bolt-elements-background-depth-3 dark:bg-bolt-elements-background-depth-4 flex items-center justify-center",
              styles.icon.container
            ),
            children: /* @__PURE__ */ jsx(
              "span",
              {
                className: classNames(
                  icon,
                  styles.icon.size,
                  "text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark"
                )
              }
            )
          }
        ),
        /* @__PURE__ */ jsx("p", { className: classNames("font-medium", styles.title), children: title }),
        description && /* @__PURE__ */ jsx(
          "p",
          {
            className: classNames(
              "text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark text-center max-w-xs",
              styles.description
            ),
            children: description
          }
        ),
        (actionLabel || secondaryActionLabel) && /* @__PURE__ */ jsxs("div", { className: classNames("flex items-center gap-2", styles.actions), children: [
          actionLabel && onAction && /* @__PURE__ */ jsx(motion.div, { ...buttonAnimation, children: /* @__PURE__ */ jsx(
            Button$1,
            {
              onClick: onAction,
              variant: "default",
              size: styles.buttonSize,
              className: "bg-purple-500 hover:bg-purple-600 text-white",
              children: actionLabel
            }
          ) }),
          secondaryActionLabel && onSecondaryAction && /* @__PURE__ */ jsx(motion.div, { ...buttonAnimation, children: /* @__PURE__ */ jsx(Button$1, { onClick: onSecondaryAction, variant: "outline", size: styles.buttonSize, children: secondaryActionLabel }) })
        ] })
      ]
    }
  );
}

function FilterChip({ label, value, onRemove, active = false, icon, className }) {
  const variants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 }
  };
  return /* @__PURE__ */ jsxs(
    motion.div,
    {
      initial: "initial",
      animate: "animate",
      exit: "exit",
      variants,
      transition: { duration: 0.2 },
      className: classNames(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
        active ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30" : "bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark",
        onRemove && "pr-1",
        className
      ),
      children: [
        icon && /* @__PURE__ */ jsx("span", { className: classNames(icon, "text-inherit") }),
        /* @__PURE__ */ jsxs("span", { children: [
          label,
          value !== void 0 && ": ",
          value !== void 0 && /* @__PURE__ */ jsx(
            "span",
            {
              className: active ? "text-purple-700 dark:text-purple-300 font-semibold" : "text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark",
              children: value
            }
          )
        ] }),
        onRemove && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: onRemove,
            className: classNames(
              "ml-1 p-0.5 rounded-full hover:bg-bolt-elements-background-depth-3 dark:hover:bg-bolt-elements-background-depth-4 transition-colors",
              active ? "text-purple-600 dark:text-purple-400" : "text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark"
            ),
            "aria-label": `Remove ${label} filter`,
            children: /* @__PURE__ */ jsx("span", { className: "i-ph:x w-3 h-3" })
          }
        )
      ]
    }
  );
}

function formatSize(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function RepositoryStats({ stats, className, compact = false }) {
  const { totalFiles, totalSize, languages, hasPackageJson, hasDependencies } = stats;
  return /* @__PURE__ */ jsxs("div", { className: classNames("space-y-3", className), children: [
    !compact && /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark", children: "Repository Statistics:" }),
    /* @__PURE__ */ jsxs("div", { className: classNames("grid gap-3", compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"), children: [
      totalFiles !== void 0 && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark", children: [
        /* @__PURE__ */ jsx("span", { className: "i-ph:files text-purple-500 w-4 h-4" }),
        /* @__PURE__ */ jsxs("span", { className: compact ? "text-xs" : "text-sm", children: [
          "Total Files: ",
          totalFiles.toLocaleString()
        ] })
      ] }),
      totalSize !== void 0 && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark", children: [
        /* @__PURE__ */ jsx("span", { className: "i-ph:database text-purple-500 w-4 h-4" }),
        /* @__PURE__ */ jsxs("span", { className: compact ? "text-xs" : "text-sm", children: [
          "Total Size: ",
          formatSize(totalSize)
        ] })
      ] })
    ] }),
    languages && Object.keys(languages).length > 0 && /* @__PURE__ */ jsxs("div", { className: compact ? "pt-1" : "pt-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark mb-2", children: [
        /* @__PURE__ */ jsx("span", { className: "i-ph:code text-purple-500 w-4 h-4" }),
        /* @__PURE__ */ jsx("span", { className: compact ? "text-xs" : "text-sm", children: "Languages:" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
        Object.entries(languages).sort(([, a], [, b]) => b - a).slice(0, compact ? 3 : 5).map(([lang, size]) => /* @__PURE__ */ jsxs(Badge, { variant: "subtle", size: compact ? "sm" : "md", children: [
          lang,
          " (",
          formatSize(size),
          ")"
        ] }, lang)),
        Object.keys(languages).length > (compact ? 3 : 5) && /* @__PURE__ */ jsxs(Badge, { variant: "subtle", size: compact ? "sm" : "md", children: [
          "+",
          Object.keys(languages).length - (compact ? 3 : 5),
          " more"
        ] })
      ] })
    ] }),
    (hasPackageJson || hasDependencies) && /* @__PURE__ */ jsx("div", { className: compact ? "pt-1" : "pt-2", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
      hasPackageJson && /* @__PURE__ */ jsx(Badge, { variant: "primary", size: compact ? "sm" : "md", icon: "i-ph:package w-3.5 h-3.5", children: "package.json" }),
      hasDependencies && /* @__PURE__ */ jsx(Badge, { variant: "primary", size: compact ? "sm" : "md", icon: "i-ph:tree-structure w-3.5 h-3.5", children: "Dependencies" })
    ] }) })
  ] });
}

const SearchInput = forwardRef(
  ({ className, onClear, showClearButton = true, iconClassName, containerClassName, loading = false, ...props }, ref) => {
    const hasValue = Boolean(props.value);
    return /* @__PURE__ */ jsxs("div", { className: classNames("relative flex items-center w-full", containerClassName), children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          className: classNames(
            "absolute left-3 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary",
            iconClassName
          ),
          children: loading ? /* @__PURE__ */ jsx("span", { className: "i-ph:spinner-gap animate-spin w-4 h-4" }) : /* @__PURE__ */ jsx("span", { className: "i-ph:magnifying-glass w-4 h-4" })
        }
      ),
      /* @__PURE__ */ jsx(
        Input,
        {
          ref,
          className: classNames("pl-10", hasValue && showClearButton ? "pr-10" : "", className),
          ...props
        }
      ),
      /* @__PURE__ */ jsx(AnimatePresence, { children: hasValue && showClearButton && /* @__PURE__ */ jsx(
        motion.button,
        {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.8 },
          transition: { duration: 0.15 },
          type: "button",
          onClick: onClear,
          className: "absolute right-3 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary p-1 rounded-full hover:bg-bolt-elements-background-depth-2",
          "aria-label": "Clear search",
          children: /* @__PURE__ */ jsx("span", { className: "i-ph:x w-3.5 h-3.5" })
        }
      ) })
    ] });
  }
);
SearchInput.displayName = "SearchInput";

const STATUS_COLORS = {
  online: "bg-green-500",
  success: "bg-green-500",
  offline: "bg-red-500",
  error: "bg-red-500",
  away: "bg-yellow-500",
  warning: "bg-yellow-500",
  busy: "bg-red-500",
  info: "bg-blue-500",
  loading: "bg-purple-500"
};
const SIZE_CLASSES = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4"
};
const TEXT_SIZE_CLASSES = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base"
};
function StatusIndicator({ status, size = "md", pulse = false, label, className }) {
  const colorClass = STATUS_COLORS[status] || "bg-gray-500";
  const sizeClass = SIZE_CLASSES[size];
  const textSizeClass = TEXT_SIZE_CLASSES[size];
  return /* @__PURE__ */ jsxs("div", { className: classNames("flex items-center gap-2", className), children: [
    /* @__PURE__ */ jsx("span", { className: classNames("rounded-full relative", colorClass, sizeClass), children: pulse && /* @__PURE__ */ jsx("span", { className: classNames("absolute inset-0 rounded-full animate-ping opacity-75", colorClass) }) }),
    label && /* @__PURE__ */ jsx(
      "span",
      {
        className: classNames(
          "text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark",
          textSizeClass
        ),
        children: label
      }
    )
  ] });
}

function RepositoryCard({ repo, onSelect }) {
  const getCardStyle = () => {
    return "from-bolt-elements-background-depth-1 to-bolt-elements-background-depth-1 dark:from-bolt-elements-background-depth-2-dark dark:to-bolt-elements-background-depth-2-dark";
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = /* @__PURE__ */ new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
    if (diffDays <= 1) {
      return "Today";
    }
    if (diffDays <= 2) {
      return "Yesterday";
    }
    if (diffDays <= 7) {
      return `${diffDays} days ago`;
    }
    if (diffDays <= 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    }
    return date.toLocaleDateString(void 0, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };
  const cardStyle = useMemo(() => getCardStyle(), []);
  return /* @__PURE__ */ jsxs(
    motion.div,
    {
      className: `p-5 rounded-xl bg-gradient-to-br ${cardStyle} border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark hover:border-purple-500/40 transition-all duration-300 shadow-sm hover:shadow-md`,
      whileHover: {
        scale: 1.02,
        y: -2,
        transition: { type: "spring", stiffness: 400, damping: 17 }
      },
      whileTap: { scale: 0.98 },
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3 },
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between mb-3 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-bolt-elements-background-depth-1/80 dark:bg-bolt-elements-background-depth-4/80 backdrop-blur-sm flex items-center justify-center text-purple-500 shadow-sm", children: /* @__PURE__ */ jsx("span", { className: "i-ph:git-branch w-5 h-5" }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h3", { className: "font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark text-base", children: repo.name }),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark flex items-center gap-1", children: [
                /* @__PURE__ */ jsx("span", { className: "i-ph:user w-3 h-3" }),
                repo.full_name.split("/")[0]
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs(
            motion.button,
            {
              onClick: onSelect,
              className: "px-4 py-2 h-9 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center text-sm shadow-sm hover:shadow-md",
              whileHover: { scale: 1.05 },
              whileTap: { scale: 0.95 },
              children: [
                /* @__PURE__ */ jsx("span", { className: "i-ph:git-pull-request w-3.5 h-3.5" }),
                "Import"
              ]
            }
          )
        ] }),
        repo.description && /* @__PURE__ */ jsx("div", { className: "mb-4 bg-bolt-elements-background-depth-1/50 dark:bg-bolt-elements-background-depth-4/50 backdrop-blur-sm p-3 rounded-lg border border-bolt-elements-borderColor/30 dark:border-bolt-elements-borderColor-dark/30", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark line-clamp-2", children: repo.description }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          repo.private && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "i-ph:lock w-3 h-3" }),
            "Private"
          ] }),
          repo.language && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 px-2 py-1 rounded-lg bg-bolt-elements-background-depth-1/50 dark:bg-bolt-elements-background-depth-4/50 backdrop-blur-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark text-xs border border-bolt-elements-borderColor/30 dark:border-bolt-elements-borderColor-dark/30", children: [
            /* @__PURE__ */ jsx("span", { className: "i-ph:code w-3 h-3" }),
            repo.language
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 px-2 py-1 rounded-lg bg-bolt-elements-background-depth-1/50 dark:bg-bolt-elements-background-depth-4/50 backdrop-blur-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark text-xs border border-bolt-elements-borderColor/30 dark:border-bolt-elements-borderColor-dark/30", children: [
            /* @__PURE__ */ jsx("span", { className: "i-ph:star w-3 h-3" }),
            repo.stargazers_count.toLocaleString()
          ] }),
          repo.forks_count > 0 && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 px-2 py-1 rounded-lg bg-bolt-elements-background-depth-1/50 dark:bg-bolt-elements-background-depth-4/50 backdrop-blur-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark text-xs border border-bolt-elements-borderColor/30 dark:border-bolt-elements-borderColor-dark/30", children: [
            /* @__PURE__ */ jsx("span", { className: "i-ph:git-fork w-3 h-3" }),
            repo.forks_count.toLocaleString()
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 pt-3 border-t border-bolt-elements-borderColor/30 dark:border-bolt-elements-borderColor-dark/30 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 text-xs text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark", children: [
            /* @__PURE__ */ jsx("span", { className: "i-ph:clock w-3 h-3" }),
            "Updated ",
            formatDate(repo.updated_at)
          ] }),
          repo.topics && repo.topics.length > 0 && /* @__PURE__ */ jsxs("span", { className: "text-xs text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark", children: [
            repo.topics.slice(0, 1).map((topic) => /* @__PURE__ */ jsx(
              "span",
              {
                className: "px-1.5 py-0.5 rounded-full bg-bolt-elements-background-depth-1/50 dark:bg-bolt-elements-background-depth-4/50 text-xs",
                children: topic
              },
              topic
            )),
            repo.topics.length > 1 && /* @__PURE__ */ jsxs("span", { className: "ml-1", children: [
              "+",
              repo.topics.length - 1
            ] })
          ] })
        ] })
      ]
    }
  );
}

const RepositoryDialogContext = createContext({
  // This is intentionally empty as it will be overridden by the provider
  setShowAuthDialog: () => {
  }
});

function RepositoryList({ repos, isLoading, onSelect, activeTab }) {
  const { setShowAuthDialog } = useContext(RepositoryDialogContext);
  if (isLoading) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-8 text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark", children: [
      /* @__PURE__ */ jsx(StatusIndicator, { status: "loading", pulse: true, size: "lg", label: "Loading repositories...", className: "mb-2" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark", children: "This may take a moment" })
    ] });
  }
  if (repos.length === 0) {
    if (activeTab === "my-repos") {
      return /* @__PURE__ */ jsx(
        EmptyState,
        {
          icon: "i-ph:folder-simple-dashed",
          title: "No repositories found",
          description: "Connect your GitHub account or create a new repository to get started",
          actionLabel: "Connect GitHub Account",
          onAction: () => setShowAuthDialog(true)
        }
      );
    } else {
      return /* @__PURE__ */ jsx(
        EmptyState,
        {
          icon: "i-ph:magnifying-glass",
          title: "No repositories found",
          description: "Try searching with different keywords or filters"
        }
      );
    }
  }
  return /* @__PURE__ */ jsx("div", { className: "space-y-3", children: repos.map((repo) => /* @__PURE__ */ jsx(RepositoryCard, { repo, onSelect: () => onSelect(repo) }, repo.full_name)) });
}

function StatsDialog({ isOpen, onClose, onConfirm, stats, isLargeRepo }) {
  return /* @__PURE__ */ jsx(Dialog$1.Root, { open: isOpen, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxs(Dialog$1.Portal, { children: [
    /* @__PURE__ */ jsx(Dialog$1.Overlay, { className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" }),
    /* @__PURE__ */ jsx("div", { className: "fixed inset-0 flex items-center justify-center z-[9999]", children: /* @__PURE__ */ jsx(
      motion.div,
      {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.2 },
        className: "w-[90vw] md:w-[500px]",
        children: /* @__PURE__ */ jsxs(Dialog$1.Content, { className: "bg-white dark:bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark shadow-xl", children: [
          /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-bolt-elements-background-depth-3 flex items-center justify-center text-purple-500", children: /* @__PURE__ */ jsx("span", { className: "i-ph:git-branch w-5 h-5" }) }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "text-lg font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark", children: "Repository Overview" }),
                /* @__PURE__ */ jsx("p", { className: "text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark", children: "Review repository details before importing" })
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-4 bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-3 p-4 rounded-lg", children: /* @__PURE__ */ jsx(RepositoryStats, { stats }) }),
            isLargeRepo && /* @__PURE__ */ jsxs("div", { className: "p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg text-sm flex items-start gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "i-ph:warning text-yellow-600 dark:text-yellow-500 w-4 h-4 flex-shrink-0 mt-0.5" }),
              /* @__PURE__ */ jsxs("div", { className: "text-yellow-800 dark:text-yellow-500", children: [
                "This repository is quite large (",
                formatSize(stats.totalSize),
                "). Importing it might take a while and could impact performance."
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "border-t border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark p-4 flex justify-end gap-3 bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-3 rounded-b-lg", children: [
            /* @__PURE__ */ jsx(
              motion.button,
              {
                onClick: onClose,
                className: "px-4 py-2 rounded-lg bg-bolt-elements-background-depth-3 dark:bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary dark:text-bolt-elements-textSecondary-dark dark:hover:text-bolt-elements-textPrimary-dark transition-colors",
                whileHover: { scale: 1.02 },
                whileTap: { scale: 0.98 },
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsx(
              motion.button,
              {
                onClick: onConfirm,
                className: "px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors",
                whileHover: { scale: 1.02 },
                whileTap: { scale: 0.98 },
                children: "Import Repository"
              }
            )
          ] })
        ] })
      }
    ) })
  ] }) });
}

function GitHubAuthDialog({ isOpen, onClose }) {
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenType, setTokenType] = useState("classic");
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        const connectionData = {
          token,
          tokenType,
          user: {
            login: userData.login,
            avatar_url: userData.avatar_url,
            name: userData.name || userData.login
          },
          connected_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        localStorage.setItem("github_connection", JSON.stringify(connectionData));
        Cookies.set("githubToken", token);
        Cookies.set("githubUsername", userData.login);
        Cookies.set("git:github.com", JSON.stringify({ username: token, password: "x-oauth-basic" }));
        toast.success(`Successfully connected as ${userData.login}`);
        setToken("");
        onClose();
      } else {
        if (response.status === 401) {
          toast.error("Invalid GitHub token. Please check and try again.");
        } else {
          toast.error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error("Error connecting to GitHub:", error);
      toast.error("Failed to connect to GitHub. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsx(Dialog$1.Root, { open: isOpen, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxs(Dialog$1.Portal, { children: [
    /* @__PURE__ */ jsx(Dialog$1.Overlay, { className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" }),
    /* @__PURE__ */ jsx("div", { className: "fixed inset-0 flex items-center justify-center z-[9999]", children: /* @__PURE__ */ jsx(
      motion.div,
      {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.2 },
        children: /* @__PURE__ */ jsxs(Dialog$1.Content, { className: "bg-white dark:bg-[#1A1A1A] rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden", children: [
          /* @__PURE__ */ jsxs("div", { className: "p-4 space-y-3", children: [
            /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold text-[#111111] dark:text-white", children: "Access Private Repositories" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-[#666666] dark:text-[#999999]", children: "To access private repositories, you need to connect your GitHub account by providing a personal access token." }),
            /* @__PURE__ */ jsxs("div", { className: "bg-[#F9F9F9] dark:bg-[#252525] p-4 rounded-lg space-y-3", children: [
              /* @__PURE__ */ jsx("h3", { className: "text-base font-medium text-[#111111] dark:text-white", children: "Connect with GitHub Token" }),
              /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-3", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("label", { className: "block text-sm text-[#666666] dark:text-[#999999] mb-1", children: "GitHub Personal Access Token" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "password",
                      value: token,
                      onChange: (e) => setToken(e.target.value),
                      placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
                      className: "w-full px-3 py-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#1A1A1A] text-[#111111] dark:text-white placeholder-[#999999] text-sm"
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { className: "mt-1 text-xs text-[#666666] dark:text-[#999999]", children: [
                    "Get your token at",
                    " ",
                    /* @__PURE__ */ jsx(
                      "a",
                      {
                        href: "https://github.com/settings/tokens",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-purple-500 hover:underline",
                        children: "github.com/settings/tokens"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                  /* @__PURE__ */ jsx("label", { className: "block text-sm text-[#666666] dark:text-[#999999]", children: "Token Type" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-4", children: [
                    /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          type: "radio",
                          checked: tokenType === "classic",
                          onChange: () => setTokenType("classic"),
                          className: "w-3.5 h-3.5 accent-purple-500"
                        }
                      ),
                      /* @__PURE__ */ jsx("span", { className: "text-sm text-[#111111] dark:text-white", children: "Classic" })
                    ] }),
                    /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          type: "radio",
                          checked: tokenType === "fine-grained",
                          onChange: () => setTokenType("fine-grained"),
                          className: "w-3.5 h-3.5 accent-purple-500"
                        }
                      ),
                      /* @__PURE__ */ jsx("span", { className: "text-sm text-[#111111] dark:text-white", children: "Fine-grained" })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "submit",
                    disabled: isSubmitting,
                    className: "w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm",
                    children: isSubmitting ? "Connecting..." : "Connect to GitHub"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg space-y-1.5", children: [
              /* @__PURE__ */ jsxs("h3", { className: "text-sm text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsx("span", { className: "i-ph:warning-circle w-4 h-4" }),
                "Accessing Private Repositories"
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-amber-700 dark:text-amber-400", children: "Important things to know about accessing private repositories:" }),
              /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-4 text-xs text-amber-700 dark:text-amber-400 space-y-0.5", children: [
                /* @__PURE__ */ jsx("li", { children: "You must be granted access to the repository by its owner" }),
                /* @__PURE__ */ jsx("li", { children: "Your GitHub token must have the 'repo' scope" }),
                /* @__PURE__ */ jsx("li", { children: "For organization repositories, you may need additional permissions" }),
                /* @__PURE__ */ jsx("li", { children: "No token can give you access to repositories you don't have permission for" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "border-t border-[#E5E5E5] dark:border-[#333333] p-3 flex justify-end", children: /* @__PURE__ */ jsx(Dialog$1.Close, { asChild: true, children: /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onClose,
              className: "px-4 py-1.5 bg-transparent bg-[#F5F5F5] hover:bg-[#E5E5E5] dark:bg-[#252525] dark:hover:bg-[#333333] rounded-lg text-[#111111] dark:text-white transition-colors text-sm",
              children: "Close"
            }
          ) }) })
        ] })
      }
    ) })
  ] }) });
}

function RepositorySelectionDialog({ isOpen, onClose, onSelect }) {
  const [selectedRepository, setSelectedRepository] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [repositories, setRepositories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState("my-repos");
  const [customUrl, setCustomUrl] = useState("");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [filters, setFilters] = useState({});
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [currentStats, setCurrentStats] = useState(null);
  const [pendingGitUrl, setPendingGitUrl] = useState("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const handleAuthDialogClose = () => {
    setShowAuthDialog(false);
    if (activeTab === "my-repos") {
      fetchUserRepos();
    }
  };
  useEffect(() => {
    const savedConnection = getLocalStorage("github_connection");
    if (!savedConnection && "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") {
      const token = "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";
      const tokenType = "classic";
      fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${token}`
        }
      }).then((response) => {
        if (!response.ok) {
          throw new Error("Invalid token or unauthorized");
        }
        return response.json();
      }).then((data) => {
        const userData = data;
        const newConnection = {
          token,
          tokenType,
          user: {
            login: userData.login,
            avatar_url: userData.avatar_url,
            name: userData.name || userData.login
          },
          connected_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        localStorage.setItem("github_connection", JSON.stringify(newConnection));
        Cookies.set("githubToken", token);
        Cookies.set("githubUsername", userData.login);
        Cookies.set("git:github.com", JSON.stringify({ username: token, password: "x-oauth-basic" }));
        if (isOpen && activeTab === "my-repos") {
          fetchUserRepos();
        }
      }).catch((error) => {
        console.error("Failed to initialize GitHub connection from environment variables:", error);
      });
    }
  }, [isOpen]);
  useEffect(() => {
    if (isOpen && activeTab === "my-repos") {
      fetchUserRepos();
    }
  }, [isOpen, activeTab]);
  const fetchUserRepos = async () => {
    const connection = getLocalStorage("github_connection");
    if (!connection?.token) {
      toast.error("Please connect your GitHub account first");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100&type=all", {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${connection.token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }
      const data = await response.json();
      if (Array.isArray(data) && data.every((item) => typeof item === "object" && item !== null && "full_name" in item)) {
        setRepositories(data);
      } else {
        throw new Error("Invalid repository data format");
      }
    } catch (error) {
      console.error("Error fetching repos:", error);
      toast.error("Failed to fetch your repositories");
    } finally {
      setIsLoading(false);
    }
  };
  const handleSearch = async (query) => {
    setIsLoading(true);
    setSearchResults([]);
    try {
      let searchQuery2 = query;
      if (filters.language) {
        searchQuery2 += ` language:${filters.language}`;
      }
      if (filters.stars) {
        searchQuery2 += ` stars:>${filters.stars}`;
      }
      if (filters.forks) {
        searchQuery2 += ` forks:>${filters.forks}`;
      }
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery2)}&sort=stars&order=desc`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json"
          }
        }
      );
      if (!response.ok) {
        throw new Error("Failed to search repositories");
      }
      const data = await response.json();
      if (typeof data === "object" && data !== null && "items" in data && Array.isArray(data.items)) {
        setSearchResults(data.items);
      } else {
        throw new Error("Invalid search results format");
      }
    } catch (error) {
      console.error("Error searching repos:", error);
      toast.error("Failed to search repositories");
    } finally {
      setIsLoading(false);
    }
  };
  const fetchBranches = async (repo) => {
    setIsLoading(true);
    try {
      const connection = getLocalStorage("github_connection");
      const headers = connection?.token ? {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${connection.token}`
      } : {};
      const response = await fetch(`https://api.github.com/repos/${repo.full_name}/branches`, {
        headers
      });
      if (!response.ok) {
        throw new Error("Failed to fetch branches");
      }
      const data = await response.json();
      if (Array.isArray(data) && data.every((item) => typeof item === "object" && item !== null && "name" in item)) {
        setBranches(
          data.map((branch) => ({
            name: branch.name,
            default: branch.name === repo.default_branch
          }))
        );
      } else {
        throw new Error("Invalid branch data format");
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
      toast.error("Failed to fetch branches");
    } finally {
      setIsLoading(false);
    }
  };
  const handleRepoSelect = async (repo) => {
    setSelectedRepository(repo);
    await fetchBranches(repo);
  };
  const formatGitUrl = (url) => {
    const baseUrl = url.replace(/\/tree\/[^/]+/, "").replace(/\/$/, "").replace(/\.git$/, "");
    return `${baseUrl}.git`;
  };
  const verifyRepository = async (repoUrl) => {
    try {
      let branch = null;
      let cleanUrl = repoUrl;
      if (repoUrl.includes("#")) {
        const parts = repoUrl.split("#");
        cleanUrl = parts[0];
        branch = parts[1];
      }
      const [owner, repo] = cleanUrl.replace(/\.git$/, "").split("/").slice(-2);
      const connection = getLocalStorage("github_connection");
      let headers = {};
      if (connection?.token) {
        headers = {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${connection.token}`
        };
      } else if ("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") {
        headers = {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${"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"}`
        };
      }
      const repoInfoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers
      });
      if (!repoInfoResponse.ok) {
        if (repoInfoResponse.status === 401 || repoInfoResponse.status === 403) {
          throw new Error(
            `Authentication failed (${repoInfoResponse.status}). Your GitHub token may be invalid or missing the required permissions.`
          );
        } else if (repoInfoResponse.status === 404) {
          throw new Error(
            `Repository not found or is private (${repoInfoResponse.status}). To access private repositories, you need to connect your GitHub account or provide a valid token with appropriate permissions.`
          );
        } else {
          throw new Error(
            `Failed to fetch repository information: ${repoInfoResponse.statusText} (${repoInfoResponse.status})`
          );
        }
      }
      const repoInfo = await repoInfoResponse.json();
      let defaultBranch = repoInfo.default_branch || "main";
      if (branch) {
        defaultBranch = branch;
      }
      let treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        {
          headers
        }
      );
      if (!treeResponse.ok) {
        treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`, {
          headers
        });
        if (!treeResponse.ok) {
          treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
            headers
          });
        }
        if (!treeResponse.ok) {
          throw new Error(
            "Failed to fetch repository structure. Please check the repository URL and your access permissions."
          );
        }
      }
      const treeData = await treeResponse.json();
      let totalSize = 0;
      let totalFiles = 0;
      const languages = {};
      let hasPackageJson = false;
      let hasDependencies = false;
      for (const file of treeData.tree) {
        if (file.type === "blob") {
          totalFiles++;
          if (file.size) {
            totalSize += file.size;
          }
          if (file.path === "package.json") {
            hasPackageJson = true;
            const contentResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, {
              headers
            });
            if (contentResponse.ok) {
              const content = await contentResponse.json();
              const packageJson = JSON.parse(Buffer.from(content.content, "base64").toString());
              hasDependencies = !!(packageJson.dependencies || packageJson.devDependencies || packageJson.peerDependencies);
            }
          }
          const ext = file.path.split(".").pop()?.toLowerCase();
          if (ext) {
            languages[ext] = (languages[ext] || 0) + (file.size || 0);
          }
        }
      }
      const stats = {
        totalFiles,
        totalSize,
        languages,
        hasPackageJson,
        hasDependencies
      };
      return stats;
    } catch (error) {
      console.error("Error verifying repository:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to verify repository";
      if (errorMessage.includes("Authentication failed") || errorMessage.includes("may be private") || errorMessage.includes("Repository not found or is private") || errorMessage.includes("Unauthorized") || errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("404") || errorMessage.includes("access permissions")) {
        setShowAuthDialog(true);
      }
      toast.error(errorMessage);
      return null;
    }
  };
  const handleImport = async () => {
    try {
      let gitUrl;
      if (activeTab === "url" && customUrl) {
        gitUrl = formatGitUrl(customUrl);
      } else if (selectedRepository) {
        gitUrl = formatGitUrl(selectedRepository.html_url);
        if (selectedBranch) {
          gitUrl = `${gitUrl}#${selectedBranch}`;
        }
      } else {
        return;
      }
      const stats = await verifyRepository(gitUrl);
      if (!stats) {
        return;
      }
      setCurrentStats(stats);
      setPendingGitUrl(gitUrl);
      setShowStatsDialog(true);
    } catch (error) {
      console.error("Error preparing repository:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to prepare repository. Please try again.";
      if (errorMessage.includes("Authentication failed") || errorMessage.includes("may be private") || errorMessage.includes("Repository not found or is private") || errorMessage.includes("Unauthorized") || errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("404") || errorMessage.includes("access permissions")) {
        setShowAuthDialog(true);
        toast.error(
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx("p", { children: errorMessage }),
            /* @__PURE__ */ jsx("button", { onClick: () => setShowAuthDialog(true), className: "underline font-medium block text-purple-500", children: "Learn how to access private repositories" })
          ] }),
          { autoClose: 1e4 }
          // Keep the toast visible longer
        );
      } else {
        toast.error(errorMessage);
      }
    }
  };
  const handleStatsConfirm = () => {
    setShowStatsDialog(false);
    if (pendingGitUrl) {
      onSelect(pendingGitUrl);
      onClose();
    }
  };
  const handleFilterChange = (key, value) => {
    let parsedValue = value;
    if (key === "stars" || key === "forks") {
      parsedValue = value ? parseInt(value, 10) : void 0;
    }
    setFilters((prev) => ({ ...prev, [key]: parsedValue }));
    handleSearch(searchQuery);
  };
  const handleClose = () => {
    setIsLoading(false);
    setSearchQuery("");
    setSearchResults([]);
    onClose();
  };
  return /* @__PURE__ */ jsx(RepositoryDialogContext.Provider, { value: { setShowAuthDialog }, children: /* @__PURE__ */ jsxs(
    Dialog$1.Root,
    {
      open: isOpen,
      onOpenChange: (open) => {
        if (!open) {
          handleClose();
        }
      },
      children: [
        /* @__PURE__ */ jsxs(Dialog$1.Portal, { children: [
          /* @__PURE__ */ jsx(Dialog$1.Overlay, { className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-50" }),
          /* @__PURE__ */ jsxs(Dialog$1.Content, { className: "fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[650px] max-h-[85vh] overflow-hidden bg-white dark:bg-bolt-elements-background-depth-1 rounded-xl shadow-xl z-[51] border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark", children: [
            /* @__PURE__ */ jsxs("div", { className: "p-5 border-b border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark flex items-center justify-between", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/10 flex items-center justify-center text-purple-500 shadow-sm", children: /* @__PURE__ */ jsx("span", { className: "i-ph:github-logo w-5 h-5" }) }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(Dialog$1.Title, { className: "text-lg font-semibold text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark", children: "Import GitHub Repository" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark", children: "Clone a repository from GitHub to your workspace" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs(
                Dialog$1.Close,
                {
                  onClick: handleClose,
                  className: classNames(
                    "p-2 rounded-lg transition-all duration-200 ease-in-out bg-transparent",
                    "text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary",
                    "dark:text-bolt-elements-textTertiary-dark dark:hover:text-bolt-elements-textPrimary-dark",
                    "hover:bg-bolt-elements-background-depth-2 dark:hover:bg-bolt-elements-background-depth-3",
                    "focus:outline-none focus:ring-2 focus:ring-bolt-elements-borderColor dark:focus:ring-bolt-elements-borderColor-dark"
                  ),
                  children: [
                    /* @__PURE__ */ jsx("span", { className: "i-ph:x block w-5 h-5", "aria-hidden": "true" }),
                    /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close dialog" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "p-4 border-b border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark flex items-center justify-between bg-gradient-to-r from-bolt-elements-background-depth-2 to-bolt-elements-background-depth-1 dark:from-bolt-elements-background-depth-3 dark:to-bolt-elements-background-depth-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx("span", { className: "i-ph:info text-blue-500" }),
                /* @__PURE__ */ jsx("span", { className: "text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark", children: "Need to access private repositories?" })
              ] }),
              /* @__PURE__ */ jsxs(
                motion.button,
                {
                  onClick: () => setShowAuthDialog(true),
                  className: "px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm transition-colors flex items-center gap-1.5 shadow-sm",
                  whileHover: { scale: 1.02, boxShadow: "0 4px 8px rgba(124, 58, 237, 0.2)" },
                  whileTap: { scale: 0.98 },
                  children: [
                    /* @__PURE__ */ jsx("span", { className: "i-ph:github-logo w-4 h-4" }),
                    "Connect GitHub Account"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "p-5", children: [
              /* @__PURE__ */ jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsx("div", { className: "bg-[#f0f0f0] dark:bg-[#1e1e1e] rounded-lg overflow-hidden border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark", children: /* @__PURE__ */ jsxs("div", { className: "flex", children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setActiveTab("my-repos"),
                    className: classNames(
                      "flex-1 py-3 px-4 text-center text-sm font-medium transition-colors",
                      activeTab === "my-repos" ? "bg-[#e6e6e6] dark:bg-[#2a2a2a] text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark" : "bg-[#f0f0f0] dark:bg-[#1e1e1e] text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark hover:bg-[#e6e6e6] dark:hover:bg-[#2a2a2a]/50"
                    ),
                    children: "My Repos"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setActiveTab("search"),
                    className: classNames(
                      "flex-1 py-3 px-4 text-center text-sm font-medium transition-colors",
                      activeTab === "search" ? "bg-[#e6e6e6] dark:bg-[#2a2a2a] text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark" : "bg-[#f0f0f0] dark:bg-[#1e1e1e] text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark hover:bg-[#e6e6e6] dark:hover:bg-[#2a2a2a]/50"
                    ),
                    children: "Search"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setActiveTab("url"),
                    className: classNames(
                      "flex-1 py-3 px-4 text-center text-sm font-medium transition-colors",
                      activeTab === "url" ? "bg-[#e6e6e6] dark:bg-[#2a2a2a] text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark" : "bg-[#f0f0f0] dark:bg-[#1e1e1e] text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark hover:bg-[#e6e6e6] dark:hover:bg-[#2a2a2a]/50"
                    ),
                    children: "From URL"
                  }
                )
              ] }) }) }),
              activeTab === "url" ? /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
                /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-br from-bolt-elements-background-depth-1 to-bolt-elements-background-depth-1 dark:from-bolt-elements-background-depth-2-dark dark:to-bolt-elements-background-depth-2-dark p-5 rounded-xl border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark", children: [
                  /* @__PURE__ */ jsxs("h3", { className: "text-base font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark mb-3 flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx("span", { className: "i-ph:link-simple w-4 h-4 text-purple-500" }),
                    "Repository URL"
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                    /* @__PURE__ */ jsx("div", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-purple-500", children: /* @__PURE__ */ jsx("span", { className: "i-ph:github-logo w-5 h-5" }) }),
                    /* @__PURE__ */ jsx(
                      Input,
                      {
                        type: "text",
                        placeholder: "Enter GitHub repository URL (e.g., https://github.com/user/repo)",
                        value: customUrl,
                        onChange: (e) => setCustomUrl(e.target.value),
                        className: "w-full pl-10 py-3 border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "mt-3 text-xs text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark bg-white/50 dark:bg-bolt-elements-background-depth-4/50 p-3 rounded-lg border border-bolt-elements-borderColor/30 dark:border-bolt-elements-borderColor-dark/30 backdrop-blur-sm", children: /* @__PURE__ */ jsxs("p", { className: "flex items-start gap-2", children: [
                    /* @__PURE__ */ jsx("span", { className: "i-ph:info w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-500" }),
                    /* @__PURE__ */ jsxs("span", { children: [
                      "You can paste any GitHub repository URL, including specific branches or tags.",
                      /* @__PURE__ */ jsx("br", {}),
                      /* @__PURE__ */ jsx("span", { className: "text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark", children: "Example: https://github.com/username/repository/tree/branch-name" })
                    ] })
                  ] }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark", children: [
                  /* @__PURE__ */ jsx("div", { className: "h-px flex-grow bg-bolt-elements-borderColor dark:bg-bolt-elements-borderColor-dark" }),
                  /* @__PURE__ */ jsx("span", { children: "Ready to import?" }),
                  /* @__PURE__ */ jsx("div", { className: "h-px flex-grow bg-bolt-elements-borderColor dark:bg-bolt-elements-borderColor-dark" })
                ] }),
                /* @__PURE__ */ jsxs(
                  motion.button,
                  {
                    onClick: handleImport,
                    disabled: !customUrl,
                    className: classNames(
                      "w-full h-12 px-4 py-2 rounded-xl text-white transition-all duration-200 flex items-center gap-2 justify-center",
                      customUrl ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-md" : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                    ),
                    whileHover: customUrl ? { scale: 1.02, boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)" } : {},
                    whileTap: customUrl ? { scale: 0.98 } : {},
                    children: [
                      /* @__PURE__ */ jsx("span", { className: "i-ph:git-pull-request w-5 h-5" }),
                      "Import Repository"
                    ]
                  }
                )
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                activeTab === "search" && /* @__PURE__ */ jsx("div", { className: "space-y-5 mb-5", children: /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-br from-blue-500/5 to-cyan-500/5 p-5 rounded-xl border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark", children: [
                  /* @__PURE__ */ jsxs("h3", { className: "text-base font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark mb-3 flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx("span", { className: "i-ph:magnifying-glass w-4 h-4 text-blue-500" }),
                    "Search GitHub"
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsx("div", { className: "flex-1", children: /* @__PURE__ */ jsx(
                      SearchInput,
                      {
                        placeholder: "Search GitHub repositories...",
                        value: searchQuery,
                        onChange: (e) => {
                          setSearchQuery(e.target.value);
                          if (e.target.value.length > 2) {
                            handleSearch(e.target.value);
                          }
                        },
                        onKeyDown: (e) => {
                          if (e.key === "Enter" && searchQuery.length > 2) {
                            handleSearch(searchQuery);
                          }
                        },
                        onClear: () => {
                          setSearchQuery("");
                          setSearchResults([]);
                        },
                        iconClassName: "text-blue-500",
                        className: "py-3 bg-white dark:bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm",
                        loading: isLoading
                      }
                    ) }),
                    /* @__PURE__ */ jsx(
                      motion.button,
                      {
                        onClick: () => setFilters({}),
                        className: "px-3 py-2 rounded-lg bg-white dark:bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark shadow-sm",
                        whileHover: { scale: 1.05 },
                        whileTap: { scale: 0.95 },
                        title: "Clear filters",
                        children: /* @__PURE__ */ jsx("span", { className: "i-ph:funnel-simple w-4 h-4" })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "mt-3", children: [
                    /* @__PURE__ */ jsx("div", { className: "text-xs text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark mb-2", children: "Filters" }),
                    (filters.language || filters.stars || filters.forks) && /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2 mb-3", children: /* @__PURE__ */ jsxs(AnimatePresence, { children: [
                      filters.language && /* @__PURE__ */ jsx(
                        FilterChip,
                        {
                          label: "Language",
                          value: filters.language,
                          icon: "i-ph:code",
                          active: true,
                          onRemove: () => {
                            const newFilters = { ...filters };
                            delete newFilters.language;
                            setFilters(newFilters);
                            if (searchQuery.length > 2) {
                              handleSearch(searchQuery);
                            }
                          }
                        }
                      ),
                      filters.stars && /* @__PURE__ */ jsx(
                        FilterChip,
                        {
                          label: "Stars",
                          value: `>${filters.stars}`,
                          icon: "i-ph:star",
                          active: true,
                          onRemove: () => {
                            const newFilters = { ...filters };
                            delete newFilters.stars;
                            setFilters(newFilters);
                            if (searchQuery.length > 2) {
                              handleSearch(searchQuery);
                            }
                          }
                        }
                      ),
                      filters.forks && /* @__PURE__ */ jsx(
                        FilterChip,
                        {
                          label: "Forks",
                          value: `>${filters.forks}`,
                          icon: "i-ph:git-fork",
                          active: true,
                          onRemove: () => {
                            const newFilters = { ...filters };
                            delete newFilters.forks;
                            setFilters(newFilters);
                            if (searchQuery.length > 2) {
                              handleSearch(searchQuery);
                            }
                          }
                        }
                      )
                    ] }) }),
                    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
                      /* @__PURE__ */ jsxs("div", { className: "relative col-span-3 md:col-span-1", children: [
                        /* @__PURE__ */ jsx("div", { className: "absolute left-2 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark", children: /* @__PURE__ */ jsx("span", { className: "i-ph:code w-3.5 h-3.5" }) }),
                        /* @__PURE__ */ jsx(
                          "input",
                          {
                            type: "text",
                            placeholder: "Language (e.g., javascript)",
                            value: filters.language || "",
                            onChange: (e) => {
                              setFilters({ ...filters, language: e.target.value });
                              if (searchQuery.length > 2) {
                                handleSearch(searchQuery);
                              }
                            },
                            className: "w-full pl-8 px-3 py-2 text-sm rounded-lg bg-white dark:bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                        /* @__PURE__ */ jsx("div", { className: "absolute left-2 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark", children: /* @__PURE__ */ jsx("span", { className: "i-ph:star w-3.5 h-3.5" }) }),
                        /* @__PURE__ */ jsx(
                          "input",
                          {
                            type: "number",
                            placeholder: "Min stars",
                            value: filters.stars || "",
                            onChange: (e) => handleFilterChange("stars", e.target.value),
                            className: "w-full pl-8 px-3 py-2 text-sm rounded-lg bg-white dark:bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                        /* @__PURE__ */ jsx("div", { className: "absolute left-2 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark", children: /* @__PURE__ */ jsx("span", { className: "i-ph:git-fork w-3.5 h-3.5" }) }),
                        /* @__PURE__ */ jsx(
                          "input",
                          {
                            type: "number",
                            placeholder: "Min forks",
                            value: filters.forks || "",
                            onChange: (e) => handleFilterChange("forks", e.target.value),
                            className: "w-full pl-8 px-3 py-2 text-sm rounded-lg bg-white dark:bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                          }
                        )
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "mt-3 text-xs text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark bg-white/50 dark:bg-bolt-elements-background-depth-4/50 p-3 rounded-lg border border-bolt-elements-borderColor/30 dark:border-bolt-elements-borderColor-dark/30 backdrop-blur-sm", children: /* @__PURE__ */ jsxs("p", { className: "flex items-start gap-2", children: [
                    /* @__PURE__ */ jsx("span", { className: "i-ph:info w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-500" }),
                    /* @__PURE__ */ jsx("span", { children: "Search for repositories by name, description, or topics. Use filters to narrow down results." })
                  ] }) })
                ] }) }),
                /* @__PURE__ */ jsx("div", { className: "space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar", children: selectedRepository ? /* @__PURE__ */ jsxs("div", { className: "space-y-5 bg-gradient-to-br from-purple-500/5 to-blue-500/5 p-5 rounded-xl border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                      /* @__PURE__ */ jsx(
                        motion.button,
                        {
                          onClick: () => setSelectedRepository(null),
                          className: "p-2 rounded-lg hover:bg-white dark:hover:bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary shadow-sm",
                          whileHover: { scale: 1.1 },
                          whileTap: { scale: 0.9 },
                          children: /* @__PURE__ */ jsx("span", { className: "i-ph:arrow-left w-4 h-4" })
                        }
                      ),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("h3", { className: "font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark text-lg", children: selectedRepository.name }),
                        /* @__PURE__ */ jsxs("p", { className: "text-xs text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark flex items-center gap-1", children: [
                          /* @__PURE__ */ jsx("span", { className: "i-ph:user w-3 h-3" }),
                          selectedRepository.full_name.split("/")[0]
                        ] })
                      ] })
                    ] }),
                    selectedRepository.private && /* @__PURE__ */ jsx(Badge, { variant: "primary", size: "md", icon: "i-ph:lock w-3 h-3", children: "Private" })
                  ] }),
                  selectedRepository.description && /* @__PURE__ */ jsx("div", { className: "bg-white/50 dark:bg-bolt-elements-background-depth-4/50 p-3 rounded-lg border border-bolt-elements-borderColor/30 dark:border-bolt-elements-borderColor-dark/30 backdrop-blur-sm", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark", children: selectedRepository.description }) }),
                  /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                    selectedRepository.language && /* @__PURE__ */ jsx(Badge, { variant: "subtle", size: "md", icon: "i-ph:code w-3 h-3", children: selectedRepository.language }),
                    /* @__PURE__ */ jsx(Badge, { variant: "subtle", size: "md", icon: "i-ph:star w-3 h-3", children: selectedRepository.stargazers_count.toLocaleString() }),
                    selectedRepository.forks_count > 0 && /* @__PURE__ */ jsx(Badge, { variant: "subtle", size: "md", icon: "i-ph:git-fork w-3 h-3", children: selectedRepository.forks_count.toLocaleString() })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "pt-3 border-t border-bolt-elements-borderColor/30 dark:border-bolt-elements-borderColor-dark/30", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
                      /* @__PURE__ */ jsx("span", { className: "i-ph:git-branch w-4 h-4 text-purple-500" }),
                      /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark", children: "Select Branch" })
                    ] }),
                    /* @__PURE__ */ jsx(
                      "select",
                      {
                        value: selectedBranch,
                        onChange: (e) => setSelectedBranch(e.target.value),
                        className: "w-full px-3 py-3 rounded-lg bg-white dark:bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm",
                        children: branches.map((branch) => /* @__PURE__ */ jsxs(
                          "option",
                          {
                            value: branch.name,
                            className: "bg-white dark:bg-bolt-elements-background-depth-4 text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark",
                            children: [
                              branch.name,
                              " ",
                              branch.default ? "(default)" : ""
                            ]
                          },
                          branch.name
                        ))
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark", children: [
                    /* @__PURE__ */ jsx("div", { className: "h-px flex-grow bg-bolt-elements-borderColor/30 dark:bg-bolt-elements-borderColor-dark/30" }),
                    /* @__PURE__ */ jsx("span", { children: "Ready to import?" }),
                    /* @__PURE__ */ jsx("div", { className: "h-px flex-grow bg-bolt-elements-borderColor/30 dark:bg-bolt-elements-borderColor-dark/30" })
                  ] }),
                  /* @__PURE__ */ jsxs(
                    motion.button,
                    {
                      onClick: handleImport,
                      className: "w-full h-12 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white transition-all duration-200 flex items-center gap-2 justify-center shadow-md",
                      whileHover: { scale: 1.02, boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)" },
                      whileTap: { scale: 0.98 },
                      children: [
                        /* @__PURE__ */ jsx("span", { className: "i-ph:git-pull-request w-5 h-5" }),
                        "Import ",
                        selectedRepository.name
                      ]
                    }
                  )
                ] }) : /* @__PURE__ */ jsx(
                  RepositoryList,
                  {
                    repos: activeTab === "my-repos" ? repositories : searchResults,
                    isLoading,
                    onSelect: handleRepoSelect,
                    activeTab
                  }
                ) })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx(GitHubAuthDialog, { isOpen: showAuthDialog, onClose: handleAuthDialogClose }),
        currentStats && /* @__PURE__ */ jsx(
          StatsDialog,
          {
            isOpen: showStatsDialog,
            onClose: () => setShowStatsDialog(false),
            onConfirm: handleStatsConfirm,
            stats: currentStats,
            isLargeRepo: currentStats.totalSize > 50 * 1024 * 1024
          }
        )
      ]
    }
  ) });
}

const IGNORE_PATTERNS = [
  "node_modules/**",
  ".git/**",
  ".github/**",
  ".vscode/**",
  "dist/**",
  "build/**",
  ".next/**",
  "coverage/**",
  ".cache/**",
  ".idea/**",
  "**/*.log",
  "**/.DS_Store",
  "**/npm-debug.log*",
  "**/yarn-debug.log*",
  "**/yarn-error.log*",
  // Include this so npm install runs much faster '**/*lock.json',
  "**/*lock.yaml"
];
const ig = ignore().add(IGNORE_PATTERNS);
const MAX_FILE_SIZE = 100 * 1024;
const MAX_TOTAL_SIZE = 500 * 1024;
function GitCloneButton({ importChat, className }) {
  const { ready, gitClone } = useGit();
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const handleClone = async (repoUrl) => {
    if (!ready) {
      return;
    }
    setLoading(true);
    try {
      const { workdir, data } = await gitClone(repoUrl);
      if (importChat) {
        const filePaths = Object.keys(data).filter((filePath) => !ig.ignores(filePath));
        const textDecoder = new TextDecoder("utf-8");
        let totalSize = 0;
        const skippedFiles = [];
        const fileContents = [];
        for (const filePath of filePaths) {
          const { data: content, encoding } = data[filePath];
          if (content instanceof Uint8Array && !filePath.match(/\.(txt|md|astro|mjs|js|jsx|ts|tsx|json|html|css|scss|less|yml|yaml|xml|svg|vue|svelte)$/i)) {
            skippedFiles.push(filePath);
            continue;
          }
          try {
            const textContent = encoding === "utf8" ? content : content instanceof Uint8Array ? textDecoder.decode(content) : "";
            if (!textContent) {
              continue;
            }
            const fileSize = new TextEncoder().encode(textContent).length;
            if (fileSize > MAX_FILE_SIZE) {
              skippedFiles.push(`${filePath} (too large: ${Math.round(fileSize / 1024)}KB)`);
              continue;
            }
            if (totalSize + fileSize > MAX_TOTAL_SIZE) {
              skippedFiles.push(`${filePath} (would exceed total size limit)`);
              continue;
            }
            totalSize += fileSize;
            fileContents.push({
              path: filePath,
              content: textContent
            });
          } catch (e) {
            skippedFiles.push(`${filePath} (error: ${e.message})`);
          }
        }
        const commands = await detectProjectCommands(fileContents);
        const commandsMessage = createCommandsMessage(commands);
        const filesMessage = {
          role: "assistant",
          content: `Cloning the repo ${repoUrl} into ${workdir}
${skippedFiles.length > 0 ? `
Skipped files (${skippedFiles.length}):
${skippedFiles.map((f) => `- ${f}`).join("\n")}` : ""}

<boltArtifact id="imported-files" title="Git Cloned Files" type="bundled">
${fileContents.map(
            (file) => `<boltAction type="file" filePath="${file.path}">
${escapeBoltTags(file.content)}
</boltAction>`
          ).join("\n")}
</boltArtifact>`,
          id: generateId(),
          createdAt: /* @__PURE__ */ new Date()
        };
        const messages = [filesMessage];
        if (commandsMessage) {
          messages.push(commandsMessage);
        }
        await importChat(`Git Project:${repoUrl.split("/").slice(-1)[0]}`, messages);
      }
    } catch (error) {
      console.error("Error during import:", error);
      toast.error("Failed to import repository");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(
      Button$1,
      {
        onClick: () => setIsDialogOpen(true),
        title: "Clone a Git Repo",
        variant: "default",
        size: "lg",
        className: classNames(
          "gap-2 bg-bolt-elements-background-depth-1",
          "text-bolt-elements-textPrimary",
          "hover:bg-bolt-elements-background-depth-2",
          "border border-bolt-elements-borderColor",
          "h-10 px-4 py-2 min-w-[120px] justify-center",
          "transition-all duration-200 ease-in-out",
          className
        ),
        disabled: !ready || loading,
        children: [
          /* @__PURE__ */ jsx("span", { className: "i-ph:git-branch w-4 h-4" }),
          "Clone a Git Repo"
        ]
      }
    ),
    /* @__PURE__ */ jsx(RepositorySelectionDialog, { isOpen: isDialogOpen, onClose: () => setIsDialogOpen(false), onSelect: handleClone }),
    loading && /* @__PURE__ */ jsx(LoadingOverlay, { message: "Please wait while we clone the repository..." })
  ] });
}

const FilePreview = ({ files, imageDataList, onRemove }) => {
  if (!files || files.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsx("div", { className: "flex flex-row overflow-x-auto mx-2 -mt-1 p-2 bg-bolt-elements-background-depth-3 border border-b-none border-bolt-elements-borderColor rounded-lg rounded-b-none", children: files.map((file, index) => /* @__PURE__ */ jsx("div", { className: "mr-2 relative", children: imageDataList[index] && /* @__PURE__ */ jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsx("img", { src: imageDataList[index], alt: file.name, className: "max-h-20 rounded-lg" }),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => onRemove(index),
        className: "absolute -top-1 -right-1 z-10 bg-black rounded-full w-5 h-5 shadow-md hover:bg-gray-900 transition-colors flex items-center justify-center",
        children: /* @__PURE__ */ jsx("div", { className: "i-ph:x w-3 h-3 text-gray-200" })
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 w-full h-5 flex items-center px-2 rounded-b-lg text-bolt-elements-textTertiary font-thin text-xs bg-bolt-elements-background-depth-2", children: /* @__PURE__ */ jsx("span", { className: "truncate", children: file.name }) })
  ] }) }, file.name + file.size)) });
};

const ModelSelector = ({
  model,
  setModel,
  provider,
  setProvider,
  modelList,
  providerList,
  modelLoading
}) => {
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [focusedModelIndex, setFocusedModelIndex] = useState(-1);
  const modelSearchInputRef = useRef(null);
  const modelOptionsRef = useRef([]);
  const modelDropdownRef = useRef(null);
  const [providerSearchQuery, setProviderSearchQuery] = useState("");
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [focusedProviderIndex, setFocusedProviderIndex] = useState(-1);
  const providerSearchInputRef = useRef(null);
  const providerOptionsRef = useRef([]);
  const providerDropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setIsModelDropdownOpen(false);
        setModelSearchQuery("");
      }
      if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target)) {
        setIsProviderDropdownOpen(false);
        setProviderSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const filteredModels = [...modelList].filter((e) => e.provider === provider?.name && e.name).filter(
    (model2) => model2.label.toLowerCase().includes(modelSearchQuery.toLowerCase()) || model2.name.toLowerCase().includes(modelSearchQuery.toLowerCase())
  );
  const filteredProviders = providerList.filter(
    (p) => p.name.toLowerCase().includes(providerSearchQuery.toLowerCase())
  );
  useEffect(() => {
    setFocusedModelIndex(-1);
  }, [modelSearchQuery, isModelDropdownOpen]);
  useEffect(() => {
    setFocusedProviderIndex(-1);
  }, [providerSearchQuery, isProviderDropdownOpen]);
  useEffect(() => {
    if (isModelDropdownOpen && modelSearchInputRef.current) {
      modelSearchInputRef.current.focus();
    }
  }, [isModelDropdownOpen]);
  useEffect(() => {
    if (isProviderDropdownOpen && providerSearchInputRef.current) {
      providerSearchInputRef.current.focus();
    }
  }, [isProviderDropdownOpen]);
  const handleModelKeyDown = (e) => {
    if (!isModelDropdownOpen) {
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedModelIndex((prev) => prev + 1 >= filteredModels.length ? 0 : prev + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedModelIndex((prev) => prev - 1 < 0 ? filteredModels.length - 1 : prev - 1);
        break;
      case "Enter":
        e.preventDefault();
        if (focusedModelIndex >= 0 && focusedModelIndex < filteredModels.length) {
          const selectedModel = filteredModels[focusedModelIndex];
          setModel?.(selectedModel.name);
          setIsModelDropdownOpen(false);
          setModelSearchQuery("");
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsModelDropdownOpen(false);
        setModelSearchQuery("");
        break;
      case "Tab":
        if (!e.shiftKey && focusedModelIndex === filteredModels.length - 1) {
          setIsModelDropdownOpen(false);
        }
        break;
    }
  };
  const handleProviderKeyDown = (e) => {
    if (!isProviderDropdownOpen) {
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedProviderIndex((prev) => prev + 1 >= filteredProviders.length ? 0 : prev + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedProviderIndex((prev) => prev - 1 < 0 ? filteredProviders.length - 1 : prev - 1);
        break;
      case "Enter":
        e.preventDefault();
        if (focusedProviderIndex >= 0 && focusedProviderIndex < filteredProviders.length) {
          const selectedProvider = filteredProviders[focusedProviderIndex];
          if (setProvider) {
            setProvider(selectedProvider);
            const firstModel = modelList.find((m) => m.provider === selectedProvider.name);
            if (firstModel && setModel) {
              setModel(firstModel.name);
            }
          }
          setIsProviderDropdownOpen(false);
          setProviderSearchQuery("");
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsProviderDropdownOpen(false);
        setProviderSearchQuery("");
        break;
      case "Tab":
        if (!e.shiftKey && focusedProviderIndex === filteredProviders.length - 1) {
          setIsProviderDropdownOpen(false);
        }
        break;
    }
  };
  useEffect(() => {
    if (focusedModelIndex >= 0 && modelOptionsRef.current[focusedModelIndex]) {
      modelOptionsRef.current[focusedModelIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedModelIndex]);
  useEffect(() => {
    if (focusedProviderIndex >= 0 && providerOptionsRef.current[focusedProviderIndex]) {
      providerOptionsRef.current[focusedProviderIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedProviderIndex]);
  useEffect(() => {
    if (providerList.length === 0) {
      return;
    }
    if (provider && !providerList.some((p) => p.name === provider.name)) {
      const firstEnabledProvider = providerList[0];
      setProvider?.(firstEnabledProvider);
      const firstModel = modelList.find((m) => m.provider === firstEnabledProvider.name);
      if (firstModel) {
        setModel?.(firstModel.name);
      }
    }
  }, [providerList, provider, setProvider, modelList, setModel]);
  if (providerList.length === 0) {
    return /* @__PURE__ */ jsx("div", { className: "mb-2 p-4 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textPrimary", children: /* @__PURE__ */ jsx("p", { className: "text-center", children: "No providers are currently enabled. Please enable at least one provider in the settings to start using the chat." }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex gap-2 flex-col sm:flex-row", children: [
    /* @__PURE__ */ jsxs("div", { className: "relative flex w-full", onKeyDown: handleProviderKeyDown, ref: providerDropdownRef, children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          className: classNames(
            "w-full p-2 rounded-lg border border-bolt-elements-borderColor",
            "bg-bolt-elements-prompt-background text-bolt-elements-textPrimary",
            "focus-within:outline-none focus-within:ring-2 focus-within:ring-bolt-elements-focus",
            "transition-all cursor-pointer",
            isProviderDropdownOpen ? "ring-2 ring-bolt-elements-focus" : void 0
          ),
          onClick: () => setIsProviderDropdownOpen(!isProviderDropdownOpen),
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsProviderDropdownOpen(!isProviderDropdownOpen);
            }
          },
          role: "combobox",
          "aria-expanded": isProviderDropdownOpen,
          "aria-controls": "provider-listbox",
          "aria-haspopup": "listbox",
          tabIndex: 0,
          children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("div", { className: "truncate", children: provider?.name || "Select provider" }),
            /* @__PURE__ */ jsx(
              "div",
              {
                className: classNames(
                  "i-ph:caret-down w-4 h-4 text-bolt-elements-textSecondary opacity-75",
                  isProviderDropdownOpen ? "rotate-180" : void 0
                )
              }
            )
          ] })
        }
      ),
      isProviderDropdownOpen && /* @__PURE__ */ jsxs(
        "div",
        {
          className: "absolute z-20 w-full mt-1 py-1 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 shadow-lg",
          role: "listbox",
          id: "provider-listbox",
          children: [
            /* @__PURE__ */ jsx("div", { className: "px-2 pb-2", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  ref: providerSearchInputRef,
                  type: "text",
                  value: providerSearchQuery,
                  onChange: (e) => setProviderSearchQuery(e.target.value),
                  placeholder: "Search providers...",
                  className: classNames(
                    "w-full pl-2 py-1.5 rounded-md text-sm",
                    "bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor",
                    "text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary",
                    "focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus",
                    "transition-all"
                  ),
                  onClick: (e) => e.stopPropagation(),
                  role: "searchbox",
                  "aria-label": "Search providers"
                }
              ),
              /* @__PURE__ */ jsx("div", { className: "absolute left-2.5 top-1/2 -translate-y-1/2", children: /* @__PURE__ */ jsx("span", { className: "i-ph:magnifying-glass text-bolt-elements-textTertiary" }) })
            ] }) }),
            /* @__PURE__ */ jsx(
              "div",
              {
                className: classNames(
                  "max-h-60 overflow-y-auto",
                  "sm:scrollbar-none",
                  "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2",
                  "[&::-webkit-scrollbar-thumb]:bg-bolt-elements-borderColor",
                  "[&::-webkit-scrollbar-thumb]:hover:bg-bolt-elements-borderColorHover",
                  "[&::-webkit-scrollbar-thumb]:rounded-full",
                  "[&::-webkit-scrollbar-track]:bg-bolt-elements-background-depth-2",
                  "[&::-webkit-scrollbar-track]:rounded-full",
                  "sm:[&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar]:h-1.5",
                  "sm:hover:[&::-webkit-scrollbar-thumb]:bg-bolt-elements-borderColor/50",
                  "sm:hover:[&::-webkit-scrollbar-thumb:hover]:bg-bolt-elements-borderColor",
                  "sm:[&::-webkit-scrollbar-track]:bg-transparent"
                ),
                children: filteredProviders.length === 0 ? /* @__PURE__ */ jsx("div", { className: "px-3 py-2 text-sm text-bolt-elements-textTertiary", children: "No providers found" }) : filteredProviders.map((providerOption, index) => /* @__PURE__ */ jsx(
                  "div",
                  {
                    ref: (el) => providerOptionsRef.current[index] = el,
                    role: "option",
                    "aria-selected": provider?.name === providerOption.name,
                    className: classNames(
                      "px-3 py-2 text-sm cursor-pointer",
                      "hover:bg-bolt-elements-background-depth-3",
                      "text-bolt-elements-textPrimary",
                      "outline-none",
                      provider?.name === providerOption.name || focusedProviderIndex === index ? "bg-bolt-elements-background-depth-2" : void 0,
                      focusedProviderIndex === index ? "ring-1 ring-inset ring-bolt-elements-focus" : void 0
                    ),
                    onClick: (e) => {
                      e.stopPropagation();
                      if (setProvider) {
                        setProvider(providerOption);
                        const firstModel = modelList.find((m) => m.provider === providerOption.name);
                        if (firstModel && setModel) {
                          setModel(firstModel.name);
                        }
                      }
                      setIsProviderDropdownOpen(false);
                      setProviderSearchQuery("");
                    },
                    tabIndex: focusedProviderIndex === index ? 0 : -1,
                    children: providerOption.name
                  },
                  providerOption.name
                ))
              }
            )
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative flex w-full min-w-[70%]", onKeyDown: handleModelKeyDown, ref: modelDropdownRef, children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          className: classNames(
            "w-full p-2 rounded-lg border border-bolt-elements-borderColor",
            "bg-bolt-elements-prompt-background text-bolt-elements-textPrimary",
            "focus-within:outline-none focus-within:ring-2 focus-within:ring-bolt-elements-focus",
            "transition-all cursor-pointer",
            isModelDropdownOpen ? "ring-2 ring-bolt-elements-focus" : void 0
          ),
          onClick: () => setIsModelDropdownOpen(!isModelDropdownOpen),
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsModelDropdownOpen(!isModelDropdownOpen);
            }
          },
          role: "combobox",
          "aria-expanded": isModelDropdownOpen,
          "aria-controls": "model-listbox",
          "aria-haspopup": "listbox",
          tabIndex: 0,
          children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("div", { className: "truncate", children: modelList.find((m) => m.name === model)?.label || "Select model" }),
            /* @__PURE__ */ jsx(
              "div",
              {
                className: classNames(
                  "i-ph:caret-down w-4 h-4 text-bolt-elements-textSecondary opacity-75",
                  isModelDropdownOpen ? "rotate-180" : void 0
                )
              }
            )
          ] })
        }
      ),
      isModelDropdownOpen && /* @__PURE__ */ jsxs(
        "div",
        {
          className: "absolute z-10 w-full mt-1 py-1 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 shadow-lg",
          role: "listbox",
          id: "model-listbox",
          children: [
            /* @__PURE__ */ jsx("div", { className: "px-2 pb-2", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  ref: modelSearchInputRef,
                  type: "text",
                  value: modelSearchQuery,
                  onChange: (e) => setModelSearchQuery(e.target.value),
                  placeholder: "Search models...",
                  className: classNames(
                    "w-full pl-2 py-1.5 rounded-md text-sm",
                    "bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor",
                    "text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary",
                    "focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus",
                    "transition-all"
                  ),
                  onClick: (e) => e.stopPropagation(),
                  role: "searchbox",
                  "aria-label": "Search models"
                }
              ),
              /* @__PURE__ */ jsx("div", { className: "absolute left-2.5 top-1/2 -translate-y-1/2", children: /* @__PURE__ */ jsx("span", { className: "i-ph:magnifying-glass text-bolt-elements-textTertiary" }) })
            ] }) }),
            /* @__PURE__ */ jsx(
              "div",
              {
                className: classNames(
                  "max-h-60 overflow-y-auto",
                  "sm:scrollbar-none",
                  "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2",
                  "[&::-webkit-scrollbar-thumb]:bg-bolt-elements-borderColor",
                  "[&::-webkit-scrollbar-thumb]:hover:bg-bolt-elements-borderColorHover",
                  "[&::-webkit-scrollbar-thumb]:rounded-full",
                  "[&::-webkit-scrollbar-track]:bg-bolt-elements-background-depth-2",
                  "[&::-webkit-scrollbar-track]:rounded-full",
                  "sm:[&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar]:h-1.5",
                  "sm:hover:[&::-webkit-scrollbar-thumb]:bg-bolt-elements-borderColor/50",
                  "sm:hover:[&::-webkit-scrollbar-thumb:hover]:bg-bolt-elements-borderColor",
                  "sm:[&::-webkit-scrollbar-track]:bg-transparent"
                ),
                children: modelLoading === "all" || modelLoading === provider?.name ? /* @__PURE__ */ jsx("div", { className: "px-3 py-2 text-sm text-bolt-elements-textTertiary", children: "Loading..." }) : filteredModels.length === 0 ? /* @__PURE__ */ jsx("div", { className: "px-3 py-2 text-sm text-bolt-elements-textTertiary", children: "No models found" }) : filteredModels.map((modelOption, index) => /* @__PURE__ */ jsx(
                  "div",
                  {
                    ref: (el) => modelOptionsRef.current[index] = el,
                    role: "option",
                    "aria-selected": model === modelOption.name,
                    className: classNames(
                      "px-3 py-2 text-sm cursor-pointer",
                      "hover:bg-bolt-elements-background-depth-3",
                      "text-bolt-elements-textPrimary",
                      "outline-none",
                      model === modelOption.name || focusedModelIndex === index ? "bg-bolt-elements-background-depth-2" : void 0,
                      focusedModelIndex === index ? "ring-1 ring-inset ring-bolt-elements-focus" : void 0
                    ),
                    onClick: (e) => {
                      e.stopPropagation();
                      setModel?.(modelOption.name);
                      setIsModelDropdownOpen(false);
                      setModelSearchQuery("");
                    },
                    tabIndex: focusedModelIndex === index ? 0 : -1,
                    children: modelOption.label
                  },
                  index
                ))
              }
            )
          ]
        }
      )
    ] })
  ] });
};

const SpeechRecognitionButton = ({
  isListening,
  onStart,
  onStop,
  disabled
}) => {
  return /* @__PURE__ */ jsx(
    IconButton,
    {
      title: isListening ? "Stop listening" : "Start speech recognition",
      disabled,
      className: classNames("transition-all", {
        "text-bolt-elements-item-contentAccent": isListening
      }),
      onClick: isListening ? onStop : onStart,
      children: isListening ? /* @__PURE__ */ jsx("div", { className: "i-ph:microphone-slash text-xl" }) : /* @__PURE__ */ jsx("div", { className: "i-ph:microphone text-xl" })
    }
  );
};

const ScreenshotStateManager = ({
  setUploadedFiles,
  setImageDataList,
  uploadedFiles,
  imageDataList
}) => {
  useEffect(() => {
    if (setUploadedFiles && setImageDataList) {
      window.__BOLT_SET_UPLOADED_FILES__ = setUploadedFiles;
      window.__BOLT_SET_IMAGE_DATA_LIST__ = setImageDataList;
      window.__BOLT_UPLOADED_FILES__ = uploadedFiles;
      window.__BOLT_IMAGE_DATA_LIST__ = imageDataList;
    }
    return () => {
      delete window.__BOLT_SET_UPLOADED_FILES__;
      delete window.__BOLT_SET_IMAGE_DATA_LIST__;
      delete window.__BOLT_UPLOADED_FILES__;
      delete window.__BOLT_IMAGE_DATA_LIST__;
    };
  }, [setUploadedFiles, setImageDataList, uploadedFiles, imageDataList]);
  return null;
};

const FrameworkLink = ({ template }) => /* @__PURE__ */ jsx(
  "a",
  {
    href: `/git?url=https://github.com/${template.githubRepo}.git`,
    "data-state": "closed",
    "data-discover": "true",
    className: "items-center justify-center",
    children: /* @__PURE__ */ jsx(
      "div",
      {
        className: `inline-block ${template.icon} w-8 h-8 text-4xl transition-theme opacity-25 hover:opacity-100 hover:text-purple-500 dark:text-white dark:opacity-50 dark:hover:opacity-100 dark:hover:text-purple-400 transition-all`,
        title: template.label
      }
    )
  }
);
const StarterTemplates = () => {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-4", children: [
    /* @__PURE__ */ jsx("span", { className: "text-sm text-gray-500", children: "or start a blank app with your favorite stack" }),
    /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap justify-center items-center gap-4 max-w-sm", children: STARTER_TEMPLATES.map((template) => /* @__PURE__ */ jsx(FrameworkLink, { template }, template.name)) }) })
  ] });
};

function DeployChatAlert({ alert, clearAlert, postMessage }) {
  const { type, title, description, content, url, stage, buildStatus, deployStatus } = alert;
  const showProgress = stage && (buildStatus || deployStatus);
  return /* @__PURE__ */ jsx(AnimatePresence, { children: /* @__PURE__ */ jsx(
    motion.div,
    {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.3 },
      className: `rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-4 mb-2`,
      children: /* @__PURE__ */ jsxs("div", { className: "flex items-start", children: [
        /* @__PURE__ */ jsx(
          motion.div,
          {
            className: "flex-shrink-0",
            initial: { scale: 0 },
            animate: { scale: 1 },
            transition: { delay: 0.2 },
            children: /* @__PURE__ */ jsx(
              "div",
              {
                className: classNames(
                  "text-xl",
                  type === "success" ? "i-ph:check-circle-duotone text-bolt-elements-icon-success" : type === "error" ? "i-ph:warning-duotone text-bolt-elements-button-danger-text" : "i-ph:info-duotone text-bolt-elements-loader-progress"
                )
              }
            )
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "ml-3 flex-1", children: [
          /* @__PURE__ */ jsx(
            motion.h3,
            {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { delay: 0.1 },
              className: `text-sm font-medium text-bolt-elements-textPrimary`,
              children: title
            }
          ),
          /* @__PURE__ */ jsxs(
            motion.div,
            {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { delay: 0.2 },
              className: `mt-2 text-sm text-bolt-elements-textSecondary`,
              children: [
                /* @__PURE__ */ jsx("p", { children: description }),
                showProgress && /* @__PURE__ */ jsx("div", { className: "mt-4 mb-2", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 mb-3", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: classNames(
                          "w-6 h-6 rounded-full flex items-center justify-center",
                          buildStatus === "running" ? "bg-bolt-elements-loader-progress" : buildStatus === "complete" ? "bg-bolt-elements-icon-success" : buildStatus === "failed" ? "bg-bolt-elements-button-danger-background" : "bg-bolt-elements-textTertiary"
                        ),
                        children: buildStatus === "running" ? /* @__PURE__ */ jsx("div", { className: "i-svg-spinners:90-ring-with-bg text-white text-xs" }) : buildStatus === "complete" ? /* @__PURE__ */ jsx("div", { className: "i-ph:check text-white text-xs" }) : buildStatus === "failed" ? /* @__PURE__ */ jsx("div", { className: "i-ph:x text-white text-xs" }) : /* @__PURE__ */ jsx("span", { className: "text-white text-xs", children: "1" })
                      }
                    ),
                    /* @__PURE__ */ jsx("span", { className: "ml-2", children: "Build" })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: classNames(
                        "h-0.5 w-8",
                        buildStatus === "complete" ? "bg-bolt-elements-icon-success" : "bg-bolt-elements-textTertiary"
                      )
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: classNames(
                          "w-6 h-6 rounded-full flex items-center justify-center",
                          deployStatus === "running" ? "bg-bolt-elements-loader-progress" : deployStatus === "complete" ? "bg-bolt-elements-icon-success" : deployStatus === "failed" ? "bg-bolt-elements-button-danger-background" : "bg-bolt-elements-textTertiary"
                        ),
                        children: deployStatus === "running" ? /* @__PURE__ */ jsx("div", { className: "i-svg-spinners:90-ring-with-bg text-white text-xs" }) : deployStatus === "complete" ? /* @__PURE__ */ jsx("div", { className: "i-ph:check text-white text-xs" }) : deployStatus === "failed" ? /* @__PURE__ */ jsx("div", { className: "i-ph:x text-white text-xs" }) : /* @__PURE__ */ jsx("span", { className: "text-white text-xs", children: "2" })
                      }
                    ),
                    /* @__PURE__ */ jsx("span", { className: "ml-2", children: "Deploy" })
                  ] })
                ] }) }),
                content && /* @__PURE__ */ jsx("div", { className: "text-xs text-bolt-elements-textSecondary p-2 bg-bolt-elements-background-depth-3 rounded mt-4 mb-4", children: content }),
                url && type === "success" && /* @__PURE__ */ jsx("div", { className: "mt-2", children: /* @__PURE__ */ jsxs(
                  "a",
                  {
                    href: url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "text-bolt-elements-item-contentAccent hover:underline flex items-center",
                    children: [
                      /* @__PURE__ */ jsx("span", { className: "mr-1", children: "View deployed site" }),
                      /* @__PURE__ */ jsx("div", { className: "i-ph:arrow-square-out" })
                    ]
                  }
                ) })
              ]
            }
          ),
          /* @__PURE__ */ jsx(
            motion.div,
            {
              className: "mt-4",
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: 0.3 },
              children: /* @__PURE__ */ jsxs("div", { className: classNames("flex gap-2"), children: [
                type === "error" && /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => postMessage(`*Fix this deployment error*
\`\`\`
${content || description}
\`\`\`
`),
                    className: classNames(
                      `px-2 py-1.5 rounded-md text-sm font-medium`,
                      "bg-bolt-elements-button-primary-background",
                      "hover:bg-bolt-elements-button-primary-backgroundHover",
                      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bolt-elements-button-danger-background",
                      "text-bolt-elements-button-primary-text",
                      "flex items-center gap-1.5"
                    ),
                    children: [
                      /* @__PURE__ */ jsx("div", { className: "i-ph:chat-circle-duotone" }),
                      "Ask Sitara"
                    ]
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: clearAlert,
                    className: classNames(
                      `px-2 py-1.5 rounded-md text-sm font-medium`,
                      "bg-bolt-elements-button-secondary-background",
                      "hover:bg-bolt-elements-button-secondary-backgroundHover",
                      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bolt-elements-button-secondary-background",
                      "text-bolt-elements-button-secondary-text"
                    ),
                    children: "Dismiss"
                  }
                )
              ] })
            }
          )
        ] })
      ] })
    }
  ) });
}

function ChatAlert({ alert, clearAlert, postMessage }) {
  const { description, content, source } = alert;
  const isPreview = source === "preview";
  const title = isPreview ? "Preview Error" : "Terminal Error";
  const message = isPreview ? "We encountered an error while running the preview. Would you like Bolt to analyze and help resolve this issue?" : "We encountered an error while running terminal commands. Would you like Bolt to analyze and help resolve this issue?";
  return /* @__PURE__ */ jsx(AnimatePresence, { children: /* @__PURE__ */ jsx(
    motion.div,
    {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.3 },
      className: `rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-4 mb-2`,
      children: /* @__PURE__ */ jsxs("div", { className: "flex items-start", children: [
        /* @__PURE__ */ jsx(
          motion.div,
          {
            className: "flex-shrink-0",
            initial: { scale: 0 },
            animate: { scale: 1 },
            transition: { delay: 0.2 },
            children: /* @__PURE__ */ jsx("div", { className: `i-ph:warning-duotone text-xl text-bolt-elements-button-danger-text` })
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "ml-3 flex-1", children: [
          /* @__PURE__ */ jsx(
            motion.h3,
            {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { delay: 0.1 },
              className: `text-sm font-medium text-bolt-elements-textPrimary`,
              children: title
            }
          ),
          /* @__PURE__ */ jsxs(
            motion.div,
            {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { delay: 0.2 },
              className: `mt-2 text-sm text-bolt-elements-textSecondary`,
              children: [
                /* @__PURE__ */ jsx("p", { children: message }),
                description && /* @__PURE__ */ jsxs("div", { className: "text-xs text-bolt-elements-textSecondary p-2 bg-bolt-elements-background-depth-3 rounded mt-4 mb-4", children: [
                  "Error: ",
                  description
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsx(
            motion.div,
            {
              className: "mt-4",
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: 0.3 },
              children: /* @__PURE__ */ jsxs("div", { className: classNames(" flex gap-2"), children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => postMessage(
                      `*Fix this ${isPreview ? "preview" : "terminal"} error* 
\`\`\`${isPreview ? "js" : "sh"}
${content}
\`\`\`
`
                    ),
                    className: classNames(
                      `px-2 py-1.5 rounded-md text-sm font-medium`,
                      "bg-bolt-elements-button-primary-background",
                      "hover:bg-bolt-elements-button-primary-backgroundHover",
                      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bolt-elements-button-danger-background",
                      "text-bolt-elements-button-primary-text",
                      "flex items-center gap-1.5"
                    ),
                    children: [
                      /* @__PURE__ */ jsx("div", { className: "i-ph:chat-circle-duotone" }),
                      "Ask Sitara"
                    ]
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: clearAlert,
                    className: classNames(
                      `px-2 py-1.5 rounded-md text-sm font-medium`,
                      "bg-bolt-elements-button-secondary-background",
                      "hover:bg-bolt-elements-button-secondary-backgroundHover",
                      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bolt-elements-button-secondary-background",
                      "text-bolt-elements-button-secondary-text"
                    ),
                    children: "Dismiss"
                  }
                )
              ] })
            }
          )
        ] })
      ] })
    }
  ) });
}

function ProgressCompilation({ data }) {
  const [progressList, setProgressList] = React__default.useState([]);
  const [expanded, setExpanded] = useState(false);
  React__default.useEffect(() => {
    if (!data || data.length == 0) {
      setProgressList([]);
      return;
    }
    const progressMap = /* @__PURE__ */ new Map();
    data.forEach((x) => {
      const existingProgress = progressMap.get(x.label);
      if (existingProgress && existingProgress.status === "complete") {
        return;
      }
      progressMap.set(x.label, x);
    });
    const newData = Array.from(progressMap.values());
    newData.sort((a, b) => a.order - b.order);
    setProgressList(newData);
  }, [data]);
  if (progressList.length === 0) {
    return /* @__PURE__ */ jsx(Fragment, {});
  }
  return /* @__PURE__ */ jsx(AnimatePresence, { children: /* @__PURE__ */ jsx(
    "div",
    {
      className: classNames(
        "bg-bolt-elements-background-depth-2",
        "border border-bolt-elements-borderColor",
        "shadow-lg rounded-lg  relative w-full max-w-chat mx-auto z-prompt",
        "p-1"
      ),
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          className: classNames(
            "bg-bolt-elements-item-backgroundAccent",
            "p-1 rounded-lg text-bolt-elements-item-contentAccent",
            "flex "
          ),
          children: [
            /* @__PURE__ */ jsx("div", { className: "flex-1", children: /* @__PURE__ */ jsx(AnimatePresence, { children: expanded ? /* @__PURE__ */ jsx(
              motion.div,
              {
                className: "actions",
                initial: { height: 0 },
                animate: { height: "auto" },
                exit: { height: "0px" },
                transition: { duration: 0.15 },
                children: progressList.map((x, i) => {
                  return /* @__PURE__ */ jsx(ProgressItem, { progress: x }, i);
                })
              }
            ) : /* @__PURE__ */ jsx(ProgressItem, { progress: progressList.slice(-1)[0] }) }) }),
            /* @__PURE__ */ jsx(
              motion.button,
              {
                initial: { width: 0 },
                animate: { width: "auto" },
                exit: { width: 0 },
                transition: { duration: 0.15, ease: cubicEasingFn },
                className: " p-1 rounded-lg bg-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-artifacts-backgroundHover",
                onClick: () => setExpanded((v) => !v),
                children: /* @__PURE__ */ jsx("div", { className: expanded ? "i-ph:caret-up-bold" : "i-ph:caret-down-bold" })
              }
            )
          ]
        }
      )
    }
  ) });
}
const ProgressItem = ({ progress }) => {
  return /* @__PURE__ */ jsxs(
    motion.div,
    {
      className: classNames("flex text-sm gap-3"),
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15 },
      children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-1.5 ", children: /* @__PURE__ */ jsx("div", { children: progress.status === "in-progress" ? /* @__PURE__ */ jsx("div", { className: "i-svg-spinners:90-ring-with-bg" }) : progress.status === "complete" ? /* @__PURE__ */ jsx("div", { className: "i-ph:check" }) : null }) }),
        progress.message
      ]
    }
  );
};

const DEFAULT_TAB_CONFIG = [
  // User Window Tabs (Always visible by default)
  { id: "features", visible: true, window: "user", order: 0 },
  { id: "data", visible: true, window: "user", order: 1 },
  { id: "cloud-providers", visible: true, window: "user", order: 2 },
  { id: "local-providers", visible: true, window: "user", order: 3 },
  { id: "connection", visible: true, window: "user", order: 4 },
  { id: "notifications", visible: true, window: "user", order: 5 },
  { id: "event-logs", visible: true, window: "user", order: 6 },
  // User Window Tabs (In dropdown, initially hidden)
  { id: "profile", visible: false, window: "user", order: 7 },
  { id: "settings", visible: false, window: "user", order: 8 },
  { id: "task-manager", visible: false, window: "user", order: 9 },
  { id: "service-status", visible: false, window: "user", order: 10 },
  // User Window Tabs (Hidden, controlled by TaskManagerTab)
  { id: "debug", visible: false, window: "user", order: 11 },
  { id: "update", visible: false, window: "user", order: 12 },
  // Developer Window Tabs (All visible by default)
  { id: "features", visible: true, window: "developer", order: 0 },
  { id: "data", visible: true, window: "developer", order: 1 },
  { id: "cloud-providers", visible: true, window: "developer", order: 2 },
  { id: "local-providers", visible: true, window: "developer", order: 3 },
  { id: "connection", visible: true, window: "developer", order: 4 },
  { id: "notifications", visible: true, window: "developer", order: 5 },
  { id: "event-logs", visible: true, window: "developer", order: 6 },
  { id: "profile", visible: true, window: "developer", order: 7 },
  { id: "settings", visible: true, window: "developer", order: 8 },
  { id: "task-manager", visible: true, window: "developer", order: 9 },
  { id: "service-status", visible: true, window: "developer", order: 10 },
  { id: "debug", visible: true, window: "developer", order: 11 },
  { id: "update", visible: true, window: "developer", order: 12 }
];

const LOCAL_PROVIDERS = ["OpenAILike", "LMStudio", "Ollama"];
map({
  toggleTheme: {
    key: "d",
    metaKey: true,
    altKey: true,
    shiftKey: true,
    action: () => toggleTheme(),
    description: "Toggle theme",
    isPreventDefault: true
  },
  toggleTerminal: {
    key: "`",
    ctrlOrMetaKey: true,
    action: () => {
    },
    description: "Toggle terminal",
    isPreventDefault: true
  }
});
const PROVIDER_SETTINGS_KEY = "provider_settings";
const isBrowser = typeof window !== "undefined";
const getInitialProviderSettings = () => {
  const initialSettings2 = {};
  PROVIDER_LIST.forEach((provider) => {
    initialSettings2[provider.name] = {
      ...provider,
      settings: {
        // Local providers should be disabled by default
        enabled: !LOCAL_PROVIDERS.includes(provider.name)
      }
    };
  });
  if (isBrowser) {
    const savedSettings = localStorage.getItem(PROVIDER_SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        Object.entries(parsed).forEach(([key, value]) => {
          if (initialSettings2[key]) {
            initialSettings2[key].settings = value.settings;
          }
        });
      } catch (error) {
        console.error("Error parsing saved provider settings:", error);
      }
    }
  }
  return initialSettings2;
};
map(getInitialProviderSettings());
atom(false);
const SETTINGS_KEYS = {
  LATEST_BRANCH: "isLatestBranch",
  AUTO_SELECT_TEMPLATE: "autoSelectTemplate",
  CONTEXT_OPTIMIZATION: "contextOptimizationEnabled",
  EVENT_LOGS: "isEventLogsEnabled",
  PROMPT_ID: "promptId",
  DEVELOPER_MODE: "isDeveloperMode"
};
const getInitialSettings = () => {
  const getStoredBoolean = (key, defaultValue) => {
    if (!isBrowser) {
      return defaultValue;
    }
    const stored = localStorage.getItem(key);
    if (stored === null) {
      return defaultValue;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  };
  return {
    latestBranch: getStoredBoolean(SETTINGS_KEYS.LATEST_BRANCH, false),
    autoSelectTemplate: getStoredBoolean(SETTINGS_KEYS.AUTO_SELECT_TEMPLATE, true),
    contextOptimization: getStoredBoolean(SETTINGS_KEYS.CONTEXT_OPTIMIZATION, true),
    eventLogs: getStoredBoolean(SETTINGS_KEYS.EVENT_LOGS, true),
    promptId: isBrowser ? localStorage.getItem(SETTINGS_KEYS.PROMPT_ID) || "default" : "default",
    developerMode: getStoredBoolean(SETTINGS_KEYS.DEVELOPER_MODE, false)
  };
};
const initialSettings = getInitialSettings();
atom(initialSettings.latestBranch);
atom(initialSettings.autoSelectTemplate);
atom(initialSettings.contextOptimization);
atom(initialSettings.eventLogs);
atom(initialSettings.promptId);
const getInitialTabConfiguration = () => {
  const defaultConfig = {
    userTabs: DEFAULT_TAB_CONFIG.filter((tab) => tab.window === "user"),
    developerTabs: DEFAULT_TAB_CONFIG.filter((tab) => tab.window === "developer")
  };
  if (!isBrowser) {
    return defaultConfig;
  }
  try {
    const saved = localStorage.getItem("bolt_tab_configuration");
    if (!saved) {
      return defaultConfig;
    }
    const parsed = JSON.parse(saved);
    if (!parsed?.userTabs || !parsed?.developerTabs) {
      return defaultConfig;
    }
    return {
      userTabs: parsed.userTabs.filter((tab) => tab.window === "user"),
      developerTabs: parsed.developerTabs.filter(
        (tab) => tab.window === "developer"
      )
    };
  } catch (error) {
    console.warn("Failed to parse tab configuration:", error);
    return defaultConfig;
  }
};
map(getInitialTabConfiguration());
atom(initialSettings.developerMode);
create((set) => ({
  isOpen: false,
  selectedTab: "user",
  // Default tab
  openSettings: () => {
    set({
      isOpen: true,
      selectedTab: "user"
      // Always open to user tab
    });
  },
  closeSettings: () => {
    set({
      isOpen: false,
      selectedTab: "user"
      // Reset to user tab when closing
    });
  },
  setSelectedTab: (tab) => {
    set({ selectedTab: tab });
  }
}));

const savedConnection = typeof localStorage !== "undefined" ? localStorage.getItem("supabase_connection") : null;
const savedCredentials = typeof localStorage !== "undefined" ? localStorage.getItem("supabaseCredentials") : null;
const initialState = savedConnection ? JSON.parse(savedConnection) : {
  user: null,
  token: "",
  stats: void 0,
  selectedProjectId: void 0,
  isConnected: false,
  project: void 0
};
if (savedCredentials && !initialState.credentials) {
  try {
    initialState.credentials = JSON.parse(savedCredentials);
  } catch (e) {
    console.error("Failed to parse saved credentials:", e);
  }
}
const supabaseConnection = atom(initialState);
if (initialState.token && !initialState.stats) {
  fetchSupabaseStats(initialState.token).catch(console.error);
}
const isConnecting = atom(false);
const isFetchingStats = atom(false);
const isFetchingApiKeys = atom(false);
function updateSupabaseConnection(connection) {
  const currentState = supabaseConnection.get();
  if (connection.user !== void 0 || connection.token !== void 0) {
    const newUser = connection.user !== void 0 ? connection.user : currentState.user;
    const newToken = connection.token !== void 0 ? connection.token : currentState.token;
    connection.isConnected = !!(newUser && newToken);
  }
  if (connection.selectedProjectId !== void 0) {
    if (connection.selectedProjectId && currentState.stats?.projects) {
      const selectedProject = currentState.stats.projects.find(
        (project) => project.id === connection.selectedProjectId
      );
      if (selectedProject) {
        connection.project = selectedProject;
      } else {
        connection.project = {
          id: connection.selectedProjectId,
          name: `Project ${connection.selectedProjectId.substring(0, 8)}...`,
          region: "unknown",
          organization_id: "",
          status: "active",
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    } else if (connection.selectedProjectId === "") {
      connection.project = void 0;
      connection.credentials = void 0;
    }
  }
  const newState = { ...currentState, ...connection };
  supabaseConnection.set(newState);
  if (connection.user || connection.token || connection.selectedProjectId !== void 0 || connection.credentials) {
    localStorage.setItem("supabase_connection", JSON.stringify(newState));
    if (newState.credentials) {
      localStorage.setItem("supabaseCredentials", JSON.stringify(newState.credentials));
    } else {
      localStorage.removeItem("supabaseCredentials");
    }
  } else {
    localStorage.removeItem("supabase_connection");
    localStorage.removeItem("supabaseCredentials");
  }
}
async function fetchSupabaseStats(token) {
  isFetchingStats.set(true);
  try {
    const response = await fetch("/api/supabase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token
      })
    });
    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }
    const data = await response.json();
    updateSupabaseConnection({
      user: data.user,
      stats: data.stats
    });
  } catch (error) {
    console.error("Failed to fetch Supabase stats:", error);
    throw error;
  } finally {
    isFetchingStats.set(false);
  }
}
async function fetchProjectApiKeys(projectId, token) {
  isFetchingApiKeys.set(true);
  try {
    const response = await fetch("/api/supabase/variables", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        projectId,
        token
      })
    });
    if (!response.ok) {
      throw new Error("Failed to fetch API keys");
    }
    const data = await response.json();
    const apiKeys = data.apiKeys;
    const anonKey = apiKeys.find((key) => key.name === "anon" || key.name === "public");
    if (anonKey) {
      const supabaseUrl = `https://${projectId}.supabase.co`;
      updateSupabaseConnection({
        credentials: {
          anonKey: anonKey.api_key,
          supabaseUrl
        }
      });
      return { anonKey: anonKey.api_key, supabaseUrl };
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch project API keys:", error);
    throw error;
  } finally {
    isFetchingApiKeys.set(false);
  }
}

function SupabaseChatAlert({ alert, clearAlert, postMessage }) {
  const { content } = alert;
  const connection = useStore(supabaseConnection);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const isConnected = !!(connection.token && connection.selectedProjectId);
  const title = isConnected ? "Supabase Query" : "Supabase Connection Required";
  const description = isConnected ? "Execute database query" : "Supabase connection required";
  const message = isConnected ? "Please review the proposed changes and apply them to your database." : "Please connect to Supabase to continue with this operation.";
  const handleConnectClick = () => {
    document.dispatchEvent(new CustomEvent("open-supabase-connection"));
  };
  const showConnectButton = !isConnected;
  const executeSupabaseAction = async (sql) => {
    if (!connection.token || !connection.selectedProjectId) {
      console.error("No Supabase token or project selected");
      return;
    }
    setIsExecuting(true);
    try {
      const response = await fetch("/api/supabase/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${connection.token}`
        },
        body: JSON.stringify({
          projectId: connection.selectedProjectId,
          query: sql
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Supabase query failed: ${errorData.error?.message || response.statusText}`);
      }
      const result = await response.json();
      console.log("Supabase query executed successfully:", result);
      clearAlert();
    } catch (error) {
      console.error("Failed to execute Supabase action:", error);
      postMessage(
        `*Error executing Supabase query please fix and return the query again*
\`\`\`
${error instanceof Error ? error.message : String(error)}
\`\`\`
`
      );
    } finally {
      setIsExecuting(false);
    }
  };
  const cleanSqlContent = (content2) => {
    if (!content2) {
      return "";
    }
    let cleaned = content2.replace(/\/\*[\s\S]*?\*\//g, "");
    cleaned = cleaned.replace(/(--).*$/gm, "").replace(/(#).*$/gm, "");
    const statements = cleaned.split(";").map((stmt) => stmt.trim()).filter((stmt) => stmt.length > 0).join(";\n\n");
    return statements;
  };
  return /* @__PURE__ */ jsx(AnimatePresence, { children: /* @__PURE__ */ jsxs(
    motion.div,
    {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.3 },
      className: "max-w-chat rounded-lg border-l-2 border-l-[#098F5F] border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2",
      children: [
        /* @__PURE__ */ jsx("div", { className: "p-4 pb-2", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("img", { height: "10", width: "18", crossOrigin: "anonymous", src: "https://cdn.simpleicons.org/supabase" }),
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-[#3DCB8F]", children: title })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "px-4", children: !isConnected ? /* @__PURE__ */ jsx("div", { className: "p-3 rounded-md bg-bolt-elements-background-depth-3", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-bolt-elements-textPrimary", children: "You must first connect to Supabase and select a project." }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: "flex items-center p-2 rounded-md bg-bolt-elements-background-depth-3 cursor-pointer",
              onClick: () => setIsCollapsed(!isCollapsed),
              children: [
                /* @__PURE__ */ jsx("div", { className: "i-ph:database text-bolt-elements-textPrimary mr-2" }),
                /* @__PURE__ */ jsx("span", { className: "text-sm text-bolt-elements-textPrimary flex-grow", children: description || "Create table and setup auth" }),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: `i-ph:caret-up text-bolt-elements-textPrimary transition-transform ${isCollapsed ? "rotate-180" : ""}`
                  }
                )
              ]
            }
          ),
          !isCollapsed && content && /* @__PURE__ */ jsx("div", { className: "mt-2 p-3 bg-bolt-elements-background-depth-4 rounded-md overflow-auto max-h-60 font-mono text-xs text-bolt-elements-textSecondary", children: /* @__PURE__ */ jsx("pre", { children: cleanSqlContent(content) }) })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-bolt-elements-textSecondary mb-4", children: message }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            showConnectButton ? /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleConnectClick,
                className: classNames(
                  `px-3 py-2 rounded-md text-sm font-medium`,
                  "bg-[#098F5F]",
                  "hover:bg-[#0aa06c]",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500",
                  "text-white",
                  "flex items-center gap-1.5"
                ),
                children: "Connect to Supabase"
              }
            ) : /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => executeSupabaseAction(content),
                disabled: isExecuting,
                className: classNames(
                  `px-3 py-2 rounded-md text-sm font-medium`,
                  "bg-[#098F5F]",
                  "hover:bg-[#0aa06c]",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500",
                  "text-white",
                  "flex items-center gap-1.5",
                  isExecuting ? "opacity-70 cursor-not-allowed" : ""
                ),
                children: isExecuting ? "Applying..." : "Apply Changes"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: clearAlert,
                disabled: isExecuting,
                className: classNames(
                  `px-3 py-2 rounded-md text-sm font-medium`,
                  "bg-[#503B26]",
                  "hover:bg-[#774f28]",
                  "focus:outline-none",
                  "text-[#F79007]",
                  isExecuting ? "opacity-70 cursor-not-allowed" : ""
                ),
                children: "Dismiss"
              }
            )
          ] })
        ] })
      ]
    }
  ) });
}

function useSupabaseConnection() {
  const connection = useStore(supabaseConnection);
  const connecting = useStore(isConnecting);
  const fetchingStats = useStore(isFetchingStats);
  const fetchingApiKeys = useStore(isFetchingApiKeys);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  useEffect(() => {
    const savedConnection = localStorage.getItem("supabase_connection");
    const savedCredentials = localStorage.getItem("supabaseCredentials");
    if (savedConnection) {
      const parsed = JSON.parse(savedConnection);
      if (savedCredentials && !parsed.credentials) {
        parsed.credentials = JSON.parse(savedCredentials);
      }
      updateSupabaseConnection(parsed);
      if (parsed.token && parsed.selectedProjectId && !parsed.credentials) {
        fetchProjectApiKeys(parsed.selectedProjectId, parsed.token).catch(console.error);
      }
    }
  }, []);
  const handleConnect = async () => {
    isConnecting.set(true);
    try {
      const cleanToken = connection.token.trim();
      const response = await fetch("/api/supabase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: cleanToken
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to connect");
      }
      updateSupabaseConnection({
        user: data.user,
        token: connection.token,
        stats: data.stats
      });
      toast.success("Successfully connected to Supabase");
      setIsProjectsExpanded(true);
      return true;
    } catch (error) {
      console.error("Connection error:", error);
      logStore.logError("Failed to authenticate with Supabase", { error });
      toast.error(error instanceof Error ? error.message : "Failed to connect to Supabase");
      updateSupabaseConnection({ user: null, token: "" });
      return false;
    } finally {
      isConnecting.set(false);
    }
  };
  const handleDisconnect = () => {
    updateSupabaseConnection({ user: null, token: "" });
    toast.success("Disconnected from Supabase");
    setIsDropdownOpen(false);
  };
  const selectProject = async (projectId) => {
    const currentState = supabaseConnection.get();
    let projectData = void 0;
    if (projectId && currentState.stats?.projects) {
      projectData = currentState.stats.projects.find((project) => project.id === projectId);
    }
    updateSupabaseConnection({
      selectedProjectId: projectId,
      project: projectData
    });
    if (projectId && currentState.token) {
      try {
        await fetchProjectApiKeys(projectId, currentState.token);
        toast.success("Project selected successfully");
      } catch (error) {
        console.error("Failed to fetch API keys:", error);
        toast.error("Selected project but failed to fetch API keys");
      }
    } else {
      toast.success("Project selected successfully");
    }
    setIsDropdownOpen(false);
  };
  const handleCreateProject = async () => {
    window.open("https://app.supabase.com/new/new-project", "_blank");
  };
  return {
    connection,
    connecting,
    fetchingStats,
    fetchingApiKeys,
    isProjectsExpanded,
    setIsProjectsExpanded,
    isDropdownOpen,
    setIsDropdownOpen,
    handleConnect,
    handleDisconnect,
    selectProject,
    handleCreateProject,
    updateToken: (token) => updateSupabaseConnection({ ...connection, token }),
    isConnected: !!(connection.user && connection.token),
    fetchProjectApiKeys: (projectId) => {
      if (connection.token) {
        return fetchProjectApiKeys(projectId, connection.token);
      }
      return Promise.reject(new Error("No token available"));
    }
  };
}

function SupabaseConnection() {
  const {
    connection: supabaseConn,
    connecting,
    fetchingStats,
    isProjectsExpanded,
    setIsProjectsExpanded,
    isDropdownOpen: isDialogOpen,
    setIsDropdownOpen: setIsDialogOpen,
    handleConnect,
    handleDisconnect,
    selectProject,
    handleCreateProject,
    updateToken,
    isConnected,
    fetchProjectApiKeys
  } = useSupabaseConnection();
  const currentChatId = useStore(chatId);
  useEffect(() => {
    const handleOpenConnectionDialog = () => {
      setIsDialogOpen(true);
    };
    document.addEventListener("open-supabase-connection", handleOpenConnectionDialog);
    return () => {
      document.removeEventListener("open-supabase-connection", handleOpenConnectionDialog);
    };
  }, [setIsDialogOpen]);
  useEffect(() => {
    if (isConnected && currentChatId) {
      const savedProjectId = localStorage.getItem(`supabase-project-${currentChatId}`);
      if (!savedProjectId && supabaseConn.selectedProjectId) {
        localStorage.setItem(`supabase-project-${currentChatId}`, supabaseConn.selectedProjectId);
      } else if (savedProjectId && savedProjectId !== supabaseConn.selectedProjectId) {
        selectProject(savedProjectId);
      }
    }
  }, [isConnected, currentChatId]);
  useEffect(() => {
    if (currentChatId && supabaseConn.selectedProjectId) {
      localStorage.setItem(`supabase-project-${currentChatId}`, supabaseConn.selectedProjectId);
    } else if (currentChatId && !supabaseConn.selectedProjectId) {
      localStorage.removeItem(`supabase-project-${currentChatId}`);
    }
  }, [currentChatId, supabaseConn.selectedProjectId]);
  useEffect(() => {
    if (isConnected && supabaseConn.token) {
      fetchSupabaseStats(supabaseConn.token).catch(console.error);
    }
  }, [isConnected, supabaseConn.token]);
  useEffect(() => {
    if (isConnected && supabaseConn.selectedProjectId && supabaseConn.token && !supabaseConn.credentials) {
      fetchProjectApiKeys(supabaseConn.selectedProjectId).catch(console.error);
    }
  }, [isConnected, supabaseConn.selectedProjectId, supabaseConn.token, supabaseConn.credentials]);
  return /* @__PURE__ */ jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsx("div", { className: "flex border border-bolt-elements-borderColor rounded-md overflow-hidden mr-2 text-sm", children: /* @__PURE__ */ jsxs(
      Button,
      {
        active: true,
        disabled: connecting,
        onClick: () => setIsDialogOpen(!isDialogOpen),
        className: "hover:bg-bolt-elements-item-backgroundActive !text-white flex items-center gap-2",
        children: [
          /* @__PURE__ */ jsx(
            "img",
            {
              className: "w-4 h-4",
              height: "20",
              width: "20",
              crossOrigin: "anonymous",
              src: "https://cdn.simpleicons.org/supabase"
            }
          ),
          isConnected && supabaseConn.project && /* @__PURE__ */ jsx("span", { className: "ml-1 text-xs max-w-[100px] truncate", children: supabaseConn.project.name })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx(Root, { open: isDialogOpen, onOpenChange: setIsDialogOpen, children: isDialogOpen && /* @__PURE__ */ jsx(Dialog, { className: "max-w-[520px] p-6", children: !isConnected ? /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs(DialogTitle, { children: [
        /* @__PURE__ */ jsx(
          "img",
          {
            className: "w-5 h-5",
            height: "24",
            width: "24",
            crossOrigin: "anonymous",
            src: "https://cdn.simpleicons.org/supabase"
          }
        ),
        "Connect to Supabase"
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm text-bolt-elements-textSecondary mb-2", children: "Access Token" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "password",
            value: supabaseConn.token,
            onChange: (e) => updateToken(e.target.value),
            disabled: connecting,
            placeholder: "Enter your Supabase access token",
            className: classNames(
              "w-full px-3 py-2 rounded-lg text-sm",
              "bg-[#F8F8F8] dark:bg-[#1A1A1A]",
              "border border-[#E5E5E5] dark:border-[#333333]",
              "text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary",
              "focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]",
              "disabled:opacity-50"
            )
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "mt-2 text-sm text-bolt-elements-textSecondary", children: /* @__PURE__ */ jsxs(
          "a",
          {
            href: "https://app.supabase.com/account/tokens",
            target: "_blank",
            rel: "noopener noreferrer",
            className: "text-[#3ECF8E] hover:underline inline-flex items-center gap-1",
            children: [
              "Get your token",
              /* @__PURE__ */ jsx("div", { className: "i-ph:arrow-square-out w-4 h-4" })
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 mt-6", children: [
        /* @__PURE__ */ jsx(Close, { asChild: true, children: /* @__PURE__ */ jsx(DialogButton, { type: "secondary", children: "Cancel" }) }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleConnect,
            disabled: connecting || !supabaseConn.token,
            className: classNames(
              "px-4 py-2 rounded-lg text-sm flex items-center gap-2",
              "bg-[#3ECF8E] text-white",
              "hover:bg-[#3BBF84]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            ),
            children: connecting ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("div", { className: "i-ph:spinner-gap animate-spin" }),
              "Connecting..."
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("div", { className: "i-ph:plug-charging w-4 h-4" }),
              "Connect"
            ] })
          }
        )
      ] })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between mb-2", children: /* @__PURE__ */ jsxs(DialogTitle, { children: [
        /* @__PURE__ */ jsx(
          "img",
          {
            className: "w-5 h-5",
            height: "24",
            width: "24",
            crossOrigin: "anonymous",
            src: "https://cdn.simpleicons.org/supabase"
          }
        ),
        "Supabase Connection"
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "flex items-center gap-4 p-3 bg-[#F8F8F8] dark:bg-[#1A1A1A] rounded-lg", children: /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h4", { className: "text-sm font-medium text-bolt-elements-textPrimary", children: supabaseConn.user?.email }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-bolt-elements-textSecondary", children: [
          "Role: ",
          supabaseConn.user?.role
        ] })
      ] }) }),
      fetchingStats ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm text-bolt-elements-textSecondary", children: [
        /* @__PURE__ */ jsx("div", { className: "i-ph:spinner-gap w-4 h-4 animate-spin" }),
        "Fetching projects..."
      ] }) : /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => setIsProjectsExpanded(!isProjectsExpanded),
              className: "bg-transparent text-left text-sm font-medium text-bolt-elements-textPrimary flex items-center gap-2",
              children: [
                /* @__PURE__ */ jsx("div", { className: "i-ph:database w-4 h-4" }),
                "Your Projects (",
                supabaseConn.stats?.totalProjects || 0,
                ")",
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: classNames(
                      "i-ph:caret-down w-4 h-4 transition-transform",
                      isProjectsExpanded ? "rotate-180" : ""
                    )
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => fetchSupabaseStats(supabaseConn.token),
                className: "px-2 py-1 rounded-md text-xs bg-[#F0F0F0] dark:bg-[#252525] text-bolt-elements-textSecondary hover:bg-[#E5E5E5] dark:hover:bg-[#333333] flex items-center gap-1",
                title: "Refresh projects list",
                children: [
                  /* @__PURE__ */ jsx("div", { className: "i-ph:arrows-clockwise w-3 h-3" }),
                  "Refresh"
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => handleCreateProject(),
                className: "px-2 py-1 rounded-md text-xs bg-[#3ECF8E] text-white hover:bg-[#3BBF84] flex items-center gap-1",
                children: [
                  /* @__PURE__ */ jsx("div", { className: "i-ph:plus w-3 h-3" }),
                  "New Project"
                ]
              }
            )
          ] })
        ] }),
        isProjectsExpanded && /* @__PURE__ */ jsxs(Fragment, { children: [
          !supabaseConn.selectedProjectId && /* @__PURE__ */ jsx("div", { className: "mb-2 p-3 bg-[#F8F8F8] dark:bg-[#1A1A1A] rounded-lg text-sm text-bolt-elements-textSecondary", children: "Select a project or create a new one for this chat" }),
          supabaseConn.stats?.projects?.length ? /* @__PURE__ */ jsx("div", { className: "grid gap-2 max-h-60 overflow-y-auto", children: supabaseConn.stats.projects.map((project) => /* @__PURE__ */ jsx(
            "div",
            {
              className: "block p-3 rounded-lg border border-[#E5E5E5] dark:border-[#1A1A1A] hover:border-[#3ECF8E] dark:hover:border-[#3ECF8E] transition-colors",
              children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("h5", { className: "text-sm font-medium text-bolt-elements-textPrimary flex items-center gap-1", children: [
                    /* @__PURE__ */ jsx("div", { className: "i-ph:database w-3 h-3 text-[#3ECF8E]" }),
                    project.name
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "text-xs text-bolt-elements-textSecondary mt-1", children: project.region })
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => selectProject(project.id),
                    className: classNames(
                      "px-3 py-1 rounded-md text-xs",
                      supabaseConn.selectedProjectId === project.id ? "bg-[#3ECF8E] text-white" : "bg-[#F0F0F0] dark:bg-[#252525] text-bolt-elements-textSecondary hover:bg-[#3ECF8E] hover:text-white"
                    ),
                    children: supabaseConn.selectedProjectId === project.id ? /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
                      /* @__PURE__ */ jsx("div", { className: "i-ph:check w-3 h-3" }),
                      "Selected"
                    ] }) : "Select"
                  }
                )
              ] })
            },
            project.id
          )) }) : /* @__PURE__ */ jsxs("div", { className: "text-sm text-bolt-elements-textSecondary flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("div", { className: "i-ph:info w-4 h-4" }),
            "No projects found"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 mt-6", children: [
        /* @__PURE__ */ jsx(Close, { asChild: true, children: /* @__PURE__ */ jsx(DialogButton, { type: "secondary", children: "Close" }) }),
        /* @__PURE__ */ jsxs(DialogButton, { type: "danger", onClick: handleDisconnect, children: [
          /* @__PURE__ */ jsx("div", { className: "i-ph:plugs w-4 h-4" }),
          "Disconnect"
        ] })
      ] })
    ] }) }) })
  ] });
}
function Button({ active = false, disabled = false, children, onClick, className }) {
  return /* @__PURE__ */ jsx(
    "button",
    {
      className: classNames(
        "flex items-center p-1.5",
        {
          "bg-bolt-elements-item-backgroundDefault hover:bg-bolt-elements-item-backgroundActive text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary": !active,
          "bg-bolt-elements-item-backgroundDefault text-bolt-elements-item-contentAccent": active && !disabled,
          "bg-bolt-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed": disabled
        },
        className
      ),
      onClick,
      children
    }
  );
}

const ExpoQrModal = ({ open, onClose }) => {
  const expoUrl = useStore(expoUrlAtom);
  return /* @__PURE__ */ jsx(Root, { open, onOpenChange: (v) => !v && onClose(), children: /* @__PURE__ */ jsx(
    Dialog,
    {
      className: "text-center !flex-col !mx-auto !text-center !max-w-md",
      showCloseButton: true,
      onClose,
      children: /* @__PURE__ */ jsxs("div", { className: "border !border-bolt-elements-borderColor flex flex-col gap-5 justify-center items-center p-6 bg-bolt-elements-background-depth-2 rounded-md", children: [
        /* @__PURE__ */ jsx("div", { className: "i-bolt:expo-brand h-10 w-full invert dark:invert-none" }),
        /* @__PURE__ */ jsx(DialogTitle, { className: "text-bolt-elements-textTertiary text-lg font-semibold leading-6", children: "Preview on your own mobile device" }),
        /* @__PURE__ */ jsx(DialogDescription, { className: "bg-bolt-elements-background-depth-3 max-w-sm rounded-md p-1 border border-bolt-elements-borderColor", children: "Scan this QR code with the Expo Go app on your mobile device to open your project." }),
        /* @__PURE__ */ jsx("div", { className: "my-6 flex flex-col items-center", children: expoUrl ? /* @__PURE__ */ jsx(
          QRCode,
          {
            logoImage: "/favicon.svg",
            removeQrCodeBehindLogo: true,
            logoPadding: 3,
            logoHeight: 50,
            logoWidth: 50,
            logoPaddingStyle: "square",
            style: {
              borderRadius: 16,
              padding: 2,
              backgroundColor: "#8a5fff"
            },
            value: expoUrl,
            size: 200
          }
        ) : /* @__PURE__ */ jsx("div", { className: "text-gray-500 text-center", children: "No Expo URL detected." }) })
      ] })
    }
  ) });
};

const DEFAULT_SPRING_ANIMATION = {
  /**
   * A value from 0 to 1, on how much to damp the animation.
   * 0 means no damping, 1 means full damping.
   *
   * @default 0.7
   */
  damping: 0.7,
  /**
   * The stiffness of how fast/slow the animation gets up to speed.
   *
   * @default 0.05
   */
  stiffness: 0.05,
  /**
   * The inertial mass associated with the animation.
   * Higher numbers make the animation slower.
   *
   * @default 1.25
   */
  mass: 1.25
};
const STICK_TO_BOTTOM_OFFSET_PX = 70;
const SIXTY_FPS_INTERVAL_MS = 1e3 / 60;
const RETAIN_ANIMATION_DURATION_MS = 350;
let mouseDown = false;
globalThis.document?.addEventListener("mousedown", () => {
  mouseDown = true;
});
globalThis.document?.addEventListener("mouseup", () => {
  mouseDown = false;
});
globalThis.document?.addEventListener("click", () => {
  mouseDown = false;
});
const useStickToBottom = (options = {}) => {
  const [escapedFromLock, updateEscapedFromLock] = useState(false);
  const [isAtBottom, updateIsAtBottom] = useState(options.initial !== false);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const optionsRef = useRef(null);
  optionsRef.current = options;
  const isSelecting = useCallback(() => {
    if (!mouseDown) {
      return false;
    }
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      return false;
    }
    const range = selection.getRangeAt(0);
    return range.commonAncestorContainer.contains(scrollRef.current) || scrollRef.current?.contains(range.commonAncestorContainer);
  }, []);
  const setIsAtBottom = useCallback((isAtBottom2) => {
    state.isAtBottom = isAtBottom2;
    updateIsAtBottom(isAtBottom2);
  }, []);
  const setEscapedFromLock = useCallback((escapedFromLock2) => {
    state.escapedFromLock = escapedFromLock2;
    updateEscapedFromLock(escapedFromLock2);
  }, []);
  const state = useMemo(() => {
    let lastCalculation;
    return {
      escapedFromLock,
      isAtBottom,
      resizeDifference: 0,
      accumulated: 0,
      velocity: 0,
      listeners: /* @__PURE__ */ new Set(),
      get scrollTop() {
        return scrollRef.current?.scrollTop ?? 0;
      },
      set scrollTop(scrollTop) {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollTop;
          state.ignoreScrollToTop = scrollRef.current.scrollTop;
        }
      },
      get targetScrollTop() {
        if (!scrollRef.current || !contentRef.current) {
          return 0;
        }
        return scrollRef.current.scrollHeight - 1 - scrollRef.current.clientHeight;
      },
      get calculatedTargetScrollTop() {
        if (!scrollRef.current || !contentRef.current) {
          return 0;
        }
        const { targetScrollTop } = this;
        if (!options.targetScrollTop) {
          return targetScrollTop;
        }
        if (lastCalculation?.targetScrollTop === targetScrollTop) {
          return lastCalculation.calculatedScrollTop;
        }
        const calculatedScrollTop = Math.max(
          Math.min(
            options.targetScrollTop(targetScrollTop, {
              scrollElement: scrollRef.current,
              contentElement: contentRef.current
            }),
            targetScrollTop
          ),
          0
        );
        lastCalculation = { targetScrollTop, calculatedScrollTop };
        requestAnimationFrame(() => {
          lastCalculation = void 0;
        });
        return calculatedScrollTop;
      },
      get scrollDifference() {
        return this.calculatedTargetScrollTop - this.scrollTop;
      },
      get isNearBottom() {
        return this.scrollDifference <= STICK_TO_BOTTOM_OFFSET_PX;
      }
    };
  }, []);
  const scrollToBottom = useCallback(
    (scrollOptions = {}) => {
      if (typeof scrollOptions === "string") {
        scrollOptions = { animation: scrollOptions };
      }
      if (!scrollOptions.preserveScrollPosition) {
        setIsAtBottom(true);
      }
      const waitElapsed = Date.now() + (Number(scrollOptions.wait) || 0);
      const behavior = mergeAnimations(optionsRef.current, scrollOptions.animation);
      const { ignoreEscapes = false } = scrollOptions;
      let durationElapsed;
      let startTarget = state.calculatedTargetScrollTop;
      if (scrollOptions.duration instanceof Promise) {
        scrollOptions.duration.finally(() => {
          durationElapsed = Date.now();
        });
      } else {
        durationElapsed = waitElapsed + (scrollOptions.duration ?? 0);
      }
      const next = async () => {
        const promise = new Promise(requestAnimationFrame).then(() => {
          if (!state.isAtBottom) {
            state.animation = void 0;
            return false;
          }
          const { scrollTop } = state;
          const tick = performance.now();
          const tickDelta = (tick - (state.lastTick ?? tick)) / SIXTY_FPS_INTERVAL_MS;
          state.animation ||= { behavior, promise, ignoreEscapes };
          if (state.animation.behavior === behavior) {
            state.lastTick = tick;
          }
          if (isSelecting()) {
            return next();
          }
          if (waitElapsed > Date.now()) {
            return next();
          }
          if (scrollTop < Math.min(startTarget, state.calculatedTargetScrollTop)) {
            if (state.animation?.behavior === behavior) {
              if (behavior === "instant") {
                state.scrollTop = state.calculatedTargetScrollTop;
                return next();
              }
              state.velocity = (behavior.damping * state.velocity + behavior.stiffness * state.scrollDifference) / behavior.mass;
              state.accumulated += state.velocity * tickDelta;
              state.scrollTop += state.accumulated;
              if (state.scrollTop !== scrollTop) {
                state.accumulated = 0;
              }
            }
            return next();
          }
          if (durationElapsed > Date.now()) {
            startTarget = state.calculatedTargetScrollTop;
            return next();
          }
          state.animation = void 0;
          if (state.scrollTop < state.calculatedTargetScrollTop) {
            return scrollToBottom({
              animation: mergeAnimations(optionsRef.current, optionsRef.current.resize),
              ignoreEscapes,
              duration: Math.max(0, durationElapsed - Date.now()) || void 0
            });
          }
          return state.isAtBottom;
        });
        return promise.then((isAtBottom2) => {
          requestAnimationFrame(() => {
            if (!state.animation) {
              state.lastTick = void 0;
              state.velocity = 0;
            }
          });
          return isAtBottom2;
        });
      };
      if (scrollOptions.wait !== true) {
        state.animation = void 0;
      }
      if (state.animation?.behavior === behavior) {
        return state.animation.promise;
      }
      return next();
    },
    [setIsAtBottom, isSelecting, state]
  );
  const stopScroll = useCallback(() => {
    setEscapedFromLock(true);
    setIsAtBottom(false);
  }, [setEscapedFromLock, setIsAtBottom]);
  const handleScroll = useCallback(
    ({ target }) => {
      if (target !== scrollRef.current) {
        return;
      }
      const { scrollTop, ignoreScrollToTop } = state;
      let { lastScrollTop = scrollTop } = state;
      state.lastScrollTop = scrollTop;
      state.ignoreScrollToTop = void 0;
      if (ignoreScrollToTop && ignoreScrollToTop > scrollTop) {
        lastScrollTop = ignoreScrollToTop;
      }
      setIsNearBottom(state.isNearBottom);
      setTimeout(() => {
        if (state.resizeDifference || scrollTop === ignoreScrollToTop) {
          return;
        }
        if (isSelecting()) {
          setEscapedFromLock(true);
          setIsAtBottom(false);
          return;
        }
        const isScrollingDown = scrollTop > lastScrollTop;
        const isScrollingUp = scrollTop < lastScrollTop;
        if (state.animation?.ignoreEscapes) {
          state.scrollTop = lastScrollTop;
          return;
        }
        if (isScrollingUp) {
          setEscapedFromLock(true);
          setIsAtBottom(false);
        }
        if (isScrollingDown) {
          setEscapedFromLock(false);
        }
        if (!state.escapedFromLock && state.isNearBottom) {
          setIsAtBottom(true);
        }
      }, 1);
    },
    [setEscapedFromLock, setIsAtBottom, isSelecting, state]
  );
  const handleWheel = useCallback(
    ({ target, deltaY }) => {
      let element = target;
      while (!["scroll", "auto"].includes(getComputedStyle(element).overflow)) {
        if (!element.parentElement) {
          return;
        }
        element = element.parentElement;
      }
      if (element === scrollRef.current && deltaY < 0 && scrollRef.current.scrollHeight > scrollRef.current.clientHeight && !state.animation?.ignoreEscapes) {
        setEscapedFromLock(true);
        setIsAtBottom(false);
      }
    },
    [setEscapedFromLock, setIsAtBottom, state]
  );
  const scrollRef = useRefCallback((scroll) => {
    scrollRef.current?.removeEventListener("scroll", handleScroll);
    scrollRef.current?.removeEventListener("wheel", handleWheel);
    scroll?.addEventListener("scroll", handleScroll, { passive: true });
    scroll?.addEventListener("wheel", handleWheel, { passive: true });
  }, []);
  const contentRef = useRefCallback((content) => {
    state.resizeObserver?.disconnect();
    if (!content) {
      return;
    }
    let previousHeight;
    state.resizeObserver = new ResizeObserver(([entry]) => {
      const { height } = entry.contentRect;
      const difference = height - (previousHeight ?? height);
      state.resizeDifference = difference;
      if (state.scrollTop > state.targetScrollTop) {
        state.scrollTop = state.targetScrollTop;
      }
      setIsNearBottom(state.isNearBottom);
      if (difference >= 0) {
        const animation = mergeAnimations(
          optionsRef.current,
          previousHeight ? optionsRef.current.resize : optionsRef.current.initial
        );
        scrollToBottom({
          animation,
          wait: true,
          preserveScrollPosition: true,
          duration: animation === "instant" ? void 0 : RETAIN_ANIMATION_DURATION_MS
        });
      } else {
        if (state.isNearBottom) {
          setEscapedFromLock(false);
          setIsAtBottom(true);
        }
      }
      previousHeight = height;
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (state.resizeDifference === difference) {
            state.resizeDifference = 0;
          }
        }, 1);
      });
    });
    state.resizeObserver?.observe(content);
  }, []);
  return {
    contentRef,
    scrollRef,
    scrollToBottom,
    stopScroll,
    isAtBottom: isAtBottom || isNearBottom,
    isNearBottom,
    escapedFromLock,
    state
  };
};
function useRefCallback(callback, deps) {
  const result = useCallback((ref) => {
    result.current = ref;
    return callback(ref);
  }, deps);
  return result;
}
const animationCache = /* @__PURE__ */ new Map();
function mergeAnimations(...animations) {
  const result = { ...DEFAULT_SPRING_ANIMATION };
  let instant = false;
  for (const animation of animations) {
    if (animation === "instant") {
      instant = true;
      continue;
    }
    if (typeof animation !== "object") {
      continue;
    }
    instant = false;
    result.damping = animation.damping ?? result.damping;
    result.stiffness = animation.stiffness ?? result.stiffness;
    result.mass = animation.mass ?? result.mass;
  }
  const key = JSON.stringify(result);
  if (!animationCache.has(key)) {
    animationCache.set(key, Object.freeze(result));
  }
  return instant ? "instant" : animationCache.get(key);
}

const StickToBottomContext = createContext(null);
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
function StickToBottom({
  instance,
  children,
  resize,
  initial,
  mass,
  damping,
  stiffness,
  targetScrollTop: currentTargetScrollTop,
  contextRef,
  ...props
}) {
  const customTargetScrollTop = useRef(null);
  const targetScrollTop = React.useCallback(
    (target, elements) => {
      const get = context?.targetScrollTop ?? currentTargetScrollTop;
      return get?.(target, elements) ?? target;
    },
    [currentTargetScrollTop]
  );
  const defaultInstance = useStickToBottom({
    mass,
    damping,
    stiffness,
    resize,
    initial,
    targetScrollTop
  });
  const { scrollRef, contentRef, scrollToBottom, stopScroll, isAtBottom, escapedFromLock, state } = instance ?? defaultInstance;
  const context = useMemo(
    () => ({
      scrollToBottom,
      stopScroll,
      scrollRef,
      isAtBottom,
      escapedFromLock,
      contentRef,
      state,
      get targetScrollTop() {
        return customTargetScrollTop.current;
      },
      set targetScrollTop(targetScrollTop2) {
        customTargetScrollTop.current = targetScrollTop2;
      }
    }),
    [scrollToBottom, isAtBottom, contentRef, scrollRef, stopScroll, escapedFromLock, state]
  );
  useImperativeHandle(contextRef, () => context, [context]);
  useIsomorphicLayoutEffect(() => {
    if (!scrollRef.current) {
      return;
    }
    if (getComputedStyle(scrollRef.current).overflow === "visible") {
      scrollRef.current.style.overflow = "auto";
    }
  }, []);
  return /* @__PURE__ */ jsx(StickToBottomContext.Provider, { value: context, children: /* @__PURE__ */ jsx("div", { ...props, children: typeof children === "function" ? children(context) : children }) });
}
function Content({ children, ...props }) {
  const context = useStickToBottomContext();
  return /* @__PURE__ */ jsx("div", { ref: context.scrollRef, className: "w-full h-auto", children: /* @__PURE__ */ jsx("div", { ...props, ref: context.contentRef, children: typeof children === "function" ? children(context) : children }) });
}
StickToBottom.Content = Content;
function useStickToBottomContext() {
  const context = useContext(StickToBottomContext);
  if (!context) {
    throw new Error("use-stick-to-bottom component context must be used within a StickToBottom component");
  }
  return context;
}

const PROVIDERS = [
  {
    id: "fal",
    label: "fal.ai",
    icon: "i-ph:lightning-duotone",
    color: "text-yellow-400",
    keyName: "FAL_KEY",
    keyLink: "https://fal.ai/dashboard/keys",
    models: [
      { id: "fal-ai/flux/schnell", label: "Flux Schnell", desc: "Fastest — 4 steps" },
      { id: "fal-ai/flux/dev", label: "Flux Dev", desc: "High quality" },
      { id: "fal-ai/stable-diffusion-v3-medium", label: "SD v3 Medium", desc: "Stable Diffusion 3" }
    ]
  },
  {
    id: "gemini",
    label: "Gemini Imagen",
    icon: "i-ph:google-logo-duotone",
    color: "text-blue-400",
    keyName: "GOOGLE_GENERATIVE_AI_API_KEY",
    keyLink: "https://aistudio.google.com/app/apikey",
    models: [{ id: "imagen-3.0-generate-001", label: "Imagen 3", desc: "Google Imagen 3" }]
  },
  {
    id: "openai",
    label: "DALL·E",
    icon: "i-ph:openai-logo-duotone",
    color: "text-green-400",
    keyName: "OPENAI_API_KEY",
    keyLink: "https://platform.openai.com/api-keys",
    models: [
      { id: "dall-e-3", label: "DALL·E 3", desc: "Best quality" },
      { id: "dall-e-2", label: "DALL·E 2", desc: "Faster & cheaper" }
    ]
  }
];
const SIZES = [
  { label: "Square 1:1", value: "1024x1024" },
  { label: "Landscape 16:9", value: "1792x1024" },
  { label: "Portrait 9:16", value: "1024x1792" }
];
function ImageGenerateModal({
  open,
  onClose,
  uploadedFiles = [],
  setUploadedFiles,
  imageDataList = [],
  setImageDataList,
  messages,
  chatModel,
  chatProvider
}) {
  const [providerId, setProviderId] = useState("fal");
  const [modelId, setModelId] = useState("fal-ai/flux/schnell");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [error, setError] = useState("");
  const hasContext = (messages?.length ?? 0) > 0 && chatModel && chatProvider;
  const handleAutoSuggest = async () => {
    if (!hasContext) {
      toast.info("Start a conversation first so AI can suggest a relevant prompt");
      return;
    }
    setSuggestLoading(true);
    try {
      const res = await fetch("/api/image-prompt-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model: chatModel, provider: chatProvider })
      });
      const data = await res.json();
      if (data.prompt) {
        setPrompt(data.prompt);
        setSize(data.size || "1792x1024");
        setGenerated(null);
        setError("");
        toast.success("AI suggested a prompt for your website");
      } else {
        toast.error("Could not generate a suggestion");
      }
    } catch (e) {
      toast.error("Suggestion failed: " + (e.message || "Unknown error"));
    } finally {
      setSuggestLoading(false);
    }
  };
  const provider = PROVIDERS.find((p) => p.id === providerId);
  const handleProviderChange = (id) => {
    setProviderId(id);
    const p = PROVIDERS.find((p2) => p2.id === id);
    setModelId(p.models[0].id);
    setGenerated(null);
    setError("");
  };
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      return;
    }
    setLoading(true);
    setError("");
    setGenerated(null);
    try {
      const res = await fetch("/api/image-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size, provider: providerId, model: modelId })
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const json = await res.json();
      setGenerated({ data: json.imageData, filename: json.filename });
    } catch (err) {
      setError(err.message || "Generation failed.");
    } finally {
      setLoading(false);
    }
  };
  const handleUseImage = async () => {
    if (!generated) {
      return;
    }
    const { data, filename } = generated;
    const dataUrl = `data:image/png;base64,${data}`;
    const binary = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    try {
      await workbenchStore.createFile(`${WORK_DIR}/public/${filename}`, binary);
      toast.success(`Image saved to public/${filename}`);
    } catch (e) {
      console.error("Failed to save image:", e);
    }
    const file = new File([binary], filename, { type: "image/png" });
    setUploadedFiles?.([...uploadedFiles, file]);
    setImageDataList?.([...imageDataList, dataUrl]);
    handleClose();
  };
  const handleClose = () => {
    setPrompt("");
    setGenerated(null);
    setError("");
    onClose();
  };
  return /* @__PURE__ */ jsx(Root, { open, onOpenChange: (v) => !v && handleClose(), children: /* @__PURE__ */ jsx(Dialog, { className: "!max-w-[560px]", showCloseButton: true, onClose: handleClose, children: /* @__PURE__ */ jsxs("div", { className: "p-6 flex flex-col gap-5", children: [
    /* @__PURE__ */ jsxs(DialogTitle, { children: [
      /* @__PURE__ */ jsx("div", { className: "i-ph:image-square-duotone text-purple-400 text-2xl" }),
      "Generate Image with AI"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Provider" }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-2", children: PROVIDERS.map((p) => /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => handleProviderChange(p.id),
          className: classNames(
            "flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors",
            providerId === p.id ? "bg-purple-500/20 border-purple-500 text-bolt-elements-textPrimary" : "bg-transparent border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400"
          ),
          children: [
            /* @__PURE__ */ jsx("div", { className: classNames(p.icon, "text-lg", p.color) }),
            p.label
          ]
        },
        p.id
      )) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Model" }),
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: provider.keyLink,
            target: "_blank",
            rel: "noreferrer",
            className: "text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1",
            children: [
              /* @__PURE__ */ jsx("div", { className: "i-ph:key text-xs" }),
              "Get ",
              provider.keyName
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: provider.models.map((m) => /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setModelId(m.id),
          className: classNames(
            "flex flex-col items-start px-3 py-2 rounded-lg text-xs border transition-colors",
            modelId === m.id ? "bg-purple-500/20 border-purple-500 text-bolt-elements-textPrimary" : "bg-transparent border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400"
          ),
          children: [
            /* @__PURE__ */ jsx("span", { className: "font-medium", children: m.label }),
            /* @__PURE__ */ jsx("span", { className: "text-bolt-elements-textTertiary", children: m.desc })
          ]
        },
        m.id
      )) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Image description" }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleAutoSuggest,
            disabled: suggestLoading || !hasContext,
            title: hasContext ? "Let AI write a prompt based on your conversation" : "Start a conversation first",
            className: classNames(
              "flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-all",
              hasContext ? "border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20" : "border-bolt-elements-borderColor text-bolt-elements-textTertiary opacity-40 cursor-not-allowed"
            ),
            children: [
              suggestLoading ? /* @__PURE__ */ jsx("div", { className: "i-svg-spinners:90-ring-with-bg text-purple-400 text-sm animate-spin" }) : /* @__PURE__ */ jsx("div", { className: "i-ph:magic-wand-duotone text-sm text-purple-400" }),
              suggestLoading ? "Thinking…" : "Suggest with AI"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        "textarea",
        {
          className: "w-full rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary p-3 text-sm resize-none focus:outline-none focus:border-purple-500 transition-colors",
          rows: 3,
          placeholder: "e.g. A pizza restaurant hero banner with warm sunset colors, rustic wood background, cinematic lighting",
          value: prompt,
          onChange: (e) => setPrompt(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              handleGenerate();
            }
          }
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Aspect ratio" }),
      /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: SIZES.map((s) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setSize(s.value),
          className: classNames(
            "px-3 py-1.5 rounded-lg text-xs border transition-colors",
            size === s.value ? "bg-purple-500 border-purple-500 text-white" : "bg-transparent border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400"
          ),
          children: s.label
        },
        s.value
      )) })
    ] }),
    error && /* @__PURE__ */ jsxs("div", { className: "text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-2", children: [
      /* @__PURE__ */ jsx("div", { className: "i-ph:warning-circle mt-0.5 shrink-0" }),
      /* @__PURE__ */ jsx("span", { children: error })
    ] }),
    loading && /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-3 py-8", children: [
      /* @__PURE__ */ jsx("div", { className: "i-svg-spinners:90-ring-with-bg text-purple-400 text-4xl animate-spin" }),
      /* @__PURE__ */ jsxs("p", { className: "text-bolt-elements-textSecondary text-sm", children: [
        "Generating with ",
        provider.label,
        "…"
      ] })
    ] }),
    generated && !loading && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Preview" }),
      /* @__PURE__ */ jsx(
        "img",
        {
          src: `data:image/png;base64,${generated.data}`,
          alt: "Generated",
          className: "w-full rounded-lg border border-bolt-elements-borderColor object-cover max-h-72"
        }
      ),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-bolt-elements-textTertiary", children: [
        "Will be saved as ",
        /* @__PURE__ */ jsxs("span", { className: "text-purple-400 font-mono", children: [
          "public/",
          generated.filename
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center pt-1 border-t border-bolt-elements-borderColor", children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs text-bolt-elements-textTertiary", children: !generated ? "Ctrl+Enter to generate" : "Saved to public/ and added to chat" }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleClose,
            className: "px-4 py-2 rounded-lg text-sm text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition-colors",
            children: "Cancel"
          }
        ),
        generated && !loading ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setGenerated(null);
                setError("");
              },
              className: "px-4 py-2 rounded-lg text-sm border border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400 transition-colors",
              children: "Regenerate"
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleUseImage,
              className: "px-4 py-2 rounded-lg text-sm bg-purple-500 hover:bg-purple-600 text-white transition-colors flex items-center gap-2",
              children: [
                /* @__PURE__ */ jsx("div", { className: "i-ph:check-bold text-base" }),
                "Use Image"
              ]
            }
          )
        ] }) : /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleGenerate,
            disabled: !prompt.trim() || loading,
            className: "px-4 py-2 rounded-lg text-sm bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2",
            children: [
              /* @__PURE__ */ jsx("div", { className: "i-ph:magic-wand text-base" }),
              "Generate"
            ]
          }
        )
      ] })
    ] })
  ] }) }) });
}

const STORAGE_KEY = "bolt-user-templates";
function load() {
  return getLocalStorage(STORAGE_KEY) ?? [];
}
const userTemplatesStore = atom(load());
function saveUserTemplate(data) {
  const template = { ...data, id: `tpl-${Date.now()}`, createdAt: Date.now() };
  const next = [...userTemplatesStore.get(), template];
  setLocalStorage(STORAGE_KEY, next);
  userTemplatesStore.set(next);
  return template;
}
function deleteUserTemplate(id) {
  const next = userTemplatesStore.get().filter((t) => t.id !== id);
  setLocalStorage(STORAGE_KEY, next);
  userTemplatesStore.set(next);
}

const INDUSTRY_PRESETS = [
  "Pizza Restaurant",
  "Automation Agency",
  "Portfolio",
  "E-commerce Store",
  "SaaS Product",
  "Fitness Studio",
  "Law Firm",
  "Real Estate",
  "Coffee Shop",
  "Tech Startup"
];
const COLOR_PRESETS = [
  { label: "Warm Orange", value: "warm orange and red", bg: "bg-orange-500" },
  { label: "Ocean Blue", value: "ocean blue and cyan", bg: "bg-blue-500" },
  { label: "Forest Green", value: "forest green and emerald", bg: "bg-green-600" },
  { label: "Deep Purple", value: "deep purple and violet", bg: "bg-purple-600" },
  { label: "Rose Pink", value: "rose pink and coral", bg: "bg-pink-500" },
  { label: "Slate Gray", value: "slate gray and charcoal", bg: "bg-slate-600" }
];
function TemplateCustomizeModal({ open, onClose, template }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState("light");
  const [industry, setIndustry] = useState("");
  const [brandName, setBrandName] = useState("");
  const [colorPreset, setColorPreset] = useState(COLOR_PRESETS[0].value);
  if (!template) {
    return null;
  }
  const buildPrompt = () => {
    return template.basePrompt.replace(/\{THEME\}/g, `${theme} theme`).replace(/\{INDUSTRY\}/g, industry || "business").replace(/\{BRAND_NAME\}/g, brandName || "My Brand").replace(/\{PRIMARY_COLOR\}/g, colorPreset);
  };
  const handleGenerate = () => {
    const prompt = buildPrompt();
    navigate(`/?prompt=${encodeURIComponent(prompt)}`);
    onClose();
  };
  const handleClose = () => {
    setTheme("light");
    setIndustry("");
    setBrandName("");
    setColorPreset(COLOR_PRESETS[0].value);
    onClose();
  };
  const previewPrompt = buildPrompt();
  return /* @__PURE__ */ jsx(Root, { open, onOpenChange: (v) => !v && handleClose(), children: /* @__PURE__ */ jsx(Dialog, { className: "!max-w-[580px]", showCloseButton: true, onClose: handleClose, children: /* @__PURE__ */ jsxs("div", { className: "p-6 flex flex-col gap-5", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs(DialogTitle, { children: [
        /* @__PURE__ */ jsx("div", { className: "i-ph:magic-wand-duotone text-purple-400 text-2xl" }),
        "Customize Template"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-bolt-elements-textSecondary mt-1 ml-8", children: [
        /* @__PURE__ */ jsx("span", { className: "text-bolt-elements-textPrimary font-medium", children: template.name }),
        template.description && ` — ${template.description}`
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Theme" }),
      /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: ["light", "dark"].map((t) => /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setTheme(t),
          className: classNames(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-colors",
            theme === t ? "bg-purple-500/20 border-purple-500 text-bolt-elements-textPrimary" : "bg-transparent border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400"
          ),
          children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                className: t === "light" ? "i-ph:sun-duotone text-yellow-400" : "i-ph:moon-duotone text-blue-400"
              }
            ),
            t.charAt(0).toUpperCase() + t.slice(1),
            " Theme"
          ]
        },
        t
      )) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Industry / Purpose" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          className: "w-full rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors",
          placeholder: "e.g. Pizza Restaurant, SaaS Tool, Photography Portfolio…",
          value: industry,
          onChange: (e) => setIndustry(e.target.value)
        }
      ),
      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", children: INDUSTRY_PRESETS.map((p) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setIndustry(p),
          className: classNames(
            "px-2.5 py-1 rounded-full text-xs border transition-colors",
            industry === p ? "bg-purple-500 border-purple-500 text-white" : "bg-transparent border-bolt-elements-borderColor text-bolt-elements-textTertiary hover:border-purple-400 hover:text-bolt-elements-textSecondary"
          ),
          children: p
        },
        p
      )) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Brand / Company Name" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          className: "w-full rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors",
          placeholder: "e.g. Bella Napoli, AutoFlow Pro, John Doe Studio",
          value: brandName,
          onChange: (e) => setBrandName(e.target.value)
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Primary Color" }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-2", children: COLOR_PRESETS.map((c) => /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setColorPreset(c.value),
          className: classNames(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors",
            colorPreset === c.value ? "border-purple-500 bg-purple-500/10 text-bolt-elements-textPrimary" : "border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400"
          ),
          children: [
            /* @__PURE__ */ jsx("div", { className: classNames("w-3 h-3 rounded-full shrink-0", c.bg) }),
            c.label
          ]
        },
        c.value
      )) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Prompt preview" }),
      /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor px-3 py-2 text-xs text-bolt-elements-textSecondary font-mono leading-relaxed max-h-24 overflow-y-auto", children: previewPrompt })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 pt-1 border-t border-bolt-elements-borderColor", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleClose,
          className: "px-4 py-2 rounded-lg text-sm text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition-colors",
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: handleGenerate,
          className: "px-4 py-2 rounded-lg text-sm bg-purple-500 hover:bg-purple-600 text-white transition-colors flex items-center gap-2",
          children: [
            /* @__PURE__ */ jsx("div", { className: "i-ph:rocket-launch text-base" }),
            "Generate Website"
          ]
        }
      )
    ] })
  ] }) }) });
}

function UserTemplates() {
  const templates = useStore(userTemplatesStore);
  const [selected, setSelected] = useState(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  if (templates.length === 0) {
    return null;
  }
  const handleUse = (t) => {
    setSelected(t);
    setCustomizeOpen(true);
  };
  const handleDelete = (e, id, name) => {
    e.stopPropagation();
    deleteUserTemplate(id);
    toast.success(`Template "${name}" deleted`);
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "w-full max-w-chat mx-auto mt-6 px-4 lg:px-0", children: [
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-bolt-elements-textSecondary mb-3 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("div", { className: "i-ph:stack-duotone text-purple-400" }),
        "My Templates"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: templates.map((t) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: "group relative flex flex-col gap-2 p-4 rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 hover:border-purple-500/50 hover:bg-bolt-elements-background-depth-1 transition-all cursor-pointer",
          onClick: () => handleUse(t),
          children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: (e) => handleDelete(e, t.id, t.name),
                className: "absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-bolt-elements-textTertiary hover:text-red-400 hover:bg-red-500/10 transition-all",
                title: "Delete template",
                children: /* @__PURE__ */ jsx("div", { className: "i-ph:trash text-sm" })
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center", children: /* @__PURE__ */ jsx("div", { className: "i-ph:stack-duotone text-purple-400 text-lg" }) }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-bolt-elements-textPrimary truncate", children: t.name }),
              t.description && /* @__PURE__ */ jsx("p", { className: "text-xs text-bolt-elements-textTertiary mt-0.5 line-clamp-2", children: t.description })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mt-1", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs text-bolt-elements-textTertiary", children: new Date(t.createdAt).toLocaleDateString() }),
              /* @__PURE__ */ jsxs("span", { className: "text-xs text-purple-400 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity", children: [
                "Use template ",
                /* @__PURE__ */ jsx("div", { className: "i-ph:arrow-right text-xs" })
              ] })
            ] })
          ]
        },
        t.id
      )) })
    ] }),
    /* @__PURE__ */ jsx(TemplateCustomizeModal, { open: customizeOpen, onClose: () => setCustomizeOpen(false), template: selected })
  ] });
}

function SaveTemplateModal({ open, onClose, messages, model, provider }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState("form");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [error, setError] = useState("");
  const handleGenerate = async () => {
    if (!name.trim()) {
      return;
    }
    setStep("generating");
    setError("");
    try {
      const res = await fetch("/api/template-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model, provider })
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const json = await res.json();
      setGeneratedPrompt(json.templatePrompt);
      setStep("preview");
    } catch (err) {
      setError(err.message || "Failed to generate template");
      setStep("form");
    }
  };
  const handleSave = () => {
    saveUserTemplate({ name: name.trim(), description: description.trim(), basePrompt: generatedPrompt });
    toast.success(`Template "${name}" saved!`);
    handleClose();
  };
  const handleClose = () => {
    setName("");
    setDescription("");
    setStep("form");
    setGeneratedPrompt("");
    setError("");
    onClose();
  };
  return /* @__PURE__ */ jsx(Root, { open, onOpenChange: (v) => !v && handleClose(), children: /* @__PURE__ */ jsx(Dialog, { className: "!max-w-[520px]", showCloseButton: true, onClose: handleClose, children: /* @__PURE__ */ jsxs("div", { className: "p-6 flex flex-col gap-5", children: [
    /* @__PURE__ */ jsxs(DialogTitle, { children: [
      /* @__PURE__ */ jsx("div", { className: "i-ph:floppy-disk-duotone text-purple-400 text-2xl" }),
      "Save as Template"
    ] }),
    step === "form" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-bolt-elements-textSecondary", children: "The AI will analyze your project and generate a reusable template prompt with customizable placeholders for theme, industry, brand name, and colors." }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Template name *" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              className: "w-full rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors",
              placeholder: "e.g. Pizza Restaurant Landing Page",
              value: name,
              onChange: (e) => setName(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Description (optional)" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              className: "w-full rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors",
              placeholder: "e.g. Full-page restaurant site with hero, menu, and contact",
              value: description,
              onChange: (e) => setDescription(e.target.value)
            }
          )
        ] })
      ] }),
      error && /* @__PURE__ */ jsx("div", { className: "text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2", children: error }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 pt-1 border-t border-bolt-elements-borderColor", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleClose,
            className: "px-4 py-2 rounded-lg text-sm text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition-colors",
            children: "Cancel"
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleGenerate,
            disabled: !name.trim(),
            className: "px-4 py-2 rounded-lg text-sm bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2",
            children: [
              /* @__PURE__ */ jsx("div", { className: "i-ph:sparkle text-base" }),
              "Generate Template"
            ]
          }
        )
      ] })
    ] }),
    step === "generating" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-3 py-10", children: [
      /* @__PURE__ */ jsx("div", { className: "i-svg-spinners:90-ring-with-bg text-purple-400 text-4xl animate-spin" }),
      /* @__PURE__ */ jsx("p", { className: "text-bolt-elements-textSecondary text-sm", children: "AI is analyzing your project…" })
    ] }),
    step === "preview" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-bolt-elements-textSecondary", children: "Generated template prompt" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            className: "w-full rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary px-3 py-2 text-sm resize-none focus:outline-none focus:border-purple-500 transition-colors font-mono",
            rows: 8,
            value: generatedPrompt,
            onChange: (e) => setGeneratedPrompt(e.target.value)
          }
        ),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-bolt-elements-textTertiary", children: [
          "You can edit this prompt. The ",
          /* @__PURE__ */ jsx("span", { className: "text-purple-400 font-mono", children: "{" }),
          "THEME",
          /* @__PURE__ */ jsx("span", { className: "text-purple-400 font-mono", children: "}" }),
          ",",
          " ",
          /* @__PURE__ */ jsx("span", { className: "text-purple-400 font-mono", children: "{" }),
          "INDUSTRY",
          /* @__PURE__ */ jsx("span", { className: "text-purple-400 font-mono", children: "}" }),
          ",",
          " ",
          /* @__PURE__ */ jsx("span", { className: "text-purple-400 font-mono", children: "{" }),
          "BRAND_NAME",
          /* @__PURE__ */ jsx("span", { className: "text-purple-400 font-mono", children: "}" }),
          ", and",
          " ",
          /* @__PURE__ */ jsx("span", { className: "text-purple-400 font-mono", children: "{" }),
          "PRIMARY_COLOR",
          /* @__PURE__ */ jsx("span", { className: "text-purple-400 font-mono", children: "}" }),
          " will be replaced when used."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center pt-1 border-t border-bolt-elements-borderColor", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setStep("form"),
            className: "px-4 py-2 rounded-lg text-sm text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition-colors",
            children: "← Back"
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleClose,
              className: "px-4 py-2 rounded-lg text-sm text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition-colors",
              children: "Cancel"
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleSave,
              className: "px-4 py-2 rounded-lg text-sm bg-purple-500 hover:bg-purple-600 text-white transition-colors flex items-center gap-2",
              children: [
                /* @__PURE__ */ jsx("div", { className: "i-ph:check-bold text-base" }),
                "Save Template"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] }) }) });
}

const TEXTAREA_MIN_HEIGHT = 76;
const BaseChat = React__default.forwardRef(
  ({
    textareaRef,
    showChat = true,
    chatStarted = false,
    isStreaming = false,
    onStreamingChange,
    model,
    setModel,
    provider,
    setProvider,
    providerList,
    input = "",
    enhancingPrompt,
    handleInputChange,
    // promptEnhanced,
    enhancePrompt,
    sendMessage,
    handleStop,
    importChat,
    exportChat,
    uploadedFiles = [],
    setUploadedFiles,
    imageDataList = [],
    setImageDataList,
    messages,
    actionAlert,
    clearAlert,
    deployAlert,
    clearDeployAlert,
    supabaseAlert,
    clearSupabaseAlert,
    data,
    actionRunner,
    onSaveTemplate
  }, ref) => {
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;
    const [apiKeys, setApiKeys] = useState(getApiKeysFromCookies());
    const [modelList, setModelList] = useState([]);
    const [isModelSettingsCollapsed, setIsModelSettingsCollapsed] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [transcript, setTranscript] = useState("");
    const [isModelLoading, setIsModelLoading] = useState("all");
    const [progressAnnotations, setProgressAnnotations] = useState([]);
    const expoUrl = useStore(expoUrlAtom);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [showImageGen, setShowImageGen] = useState(false);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    useEffect(() => {
      if (expoUrl) {
        setQrModalOpen(true);
      }
    }, [expoUrl]);
    useEffect(() => {
      if (data) {
        const progressList = data.filter(
          (x) => typeof x === "object" && x.type === "progress"
        );
        setProgressAnnotations(progressList);
      }
    }, [data]);
    useEffect(() => {
      console.log(transcript);
    }, [transcript]);
    useEffect(() => {
      onStreamingChange?.(isStreaming);
    }, [isStreaming, onStreamingChange]);
    useEffect(() => {
      if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition2 = new SpeechRecognition();
        recognition2.continuous = true;
        recognition2.interimResults = true;
        recognition2.onresult = (event) => {
          const transcript2 = Array.from(event.results).map((result) => result[0]).map((result) => result.transcript).join("");
          setTranscript(transcript2);
          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: transcript2 }
            };
            handleInputChange(syntheticEvent);
          }
        };
        recognition2.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };
        setRecognition(recognition2);
      }
    }, []);
    useEffect(() => {
      if (typeof window !== "undefined") {
        let parsedApiKeys = {};
        try {
          parsedApiKeys = getApiKeysFromCookies();
          setApiKeys(parsedApiKeys);
        } catch (error) {
          console.error("Error loading API keys from cookies:", error);
          Cookies.remove("apiKeys");
        }
        setIsModelLoading("all");
        fetch("/api/models").then((response) => response.json()).then((data2) => {
          const typedData = data2;
          setModelList(typedData.modelList);
        }).catch((error) => {
          console.error("Error fetching model list:", error);
        }).finally(() => {
          setIsModelLoading(void 0);
        });
      }
    }, [providerList, provider]);
    const onApiKeysChange = async (providerName, apiKey) => {
      const newApiKeys = { ...apiKeys, [providerName]: apiKey };
      setApiKeys(newApiKeys);
      Cookies.set("apiKeys", JSON.stringify(newApiKeys));
      setIsModelLoading(providerName);
      let providerModels = [];
      try {
        const response = await fetch(`/api/models/${encodeURIComponent(providerName)}`);
        const data2 = await response.json();
        providerModels = data2.modelList;
      } catch (error) {
        console.error("Error loading dynamic models for:", providerName, error);
      }
      setModelList((prevModels) => {
        const otherModels = prevModels.filter((model2) => model2.provider !== providerName);
        return [...otherModels, ...providerModels];
      });
      setIsModelLoading(void 0);
    };
    const startListening = () => {
      if (recognition) {
        recognition.start();
        setIsListening(true);
      }
    };
    const stopListening = () => {
      if (recognition) {
        recognition.stop();
        setIsListening(false);
      }
    };
    const handleSendMessage = (event, messageInput) => {
      if (sendMessage) {
        sendMessage(event, messageInput);
        if (recognition) {
          recognition.abort();
          setTranscript("");
          setIsListening(false);
          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: "" }
            };
            handleInputChange(syntheticEvent);
          }
        }
      }
    };
    const handleFileUpload = () => {
      const input2 = document.createElement("input");
      input2.type = "file";
      input2.accept = "image/*";
      input2.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const base64Image = ev.target?.result;
            await saveImageToProject(file, base64Image);
          };
          reader.readAsDataURL(file);
        }
      };
      input2.click();
    };
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) {
        return;
      }
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
              const base64Image = ev.target?.result;
              await saveImageToProject(file, base64Image);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };
    const getAiFilename = async (base64DataUrl) => {
      try {
        const base64 = base64DataUrl.split(",")[1];
        const res = await fetch("/api/image-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: base64, model, provider })
        });
        if (res.ok) {
          const json = await res.json();
          return json.filename || "uploaded-image";
        }
      } catch (_e) {
      }
      return "uploaded-image";
    };
    const saveImageToProject = async (file, base64Image) => {
      const toastId = toast.loading("AI is naming your image…");
      try {
        const aiName = await getAiFilename(base64Image);
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const filename = `${aiName}.${ext}`;
        const renamedFile = new File([file], filename, { type: file.type });
        setUploadedFiles?.([...uploadedFiles, renamedFile]);
        setImageDataList?.([...imageDataList, base64Image]);
        const arrayBuffer = await file.arrayBuffer();
        await workbenchStore.createFile(`${WORK_DIR}/public/${filename}`, new Uint8Array(arrayBuffer));
        toast.update(toastId, {
          render: `Saved as public/${filename}`,
          type: "success",
          isLoading: false,
          autoClose: 3e3
        });
      } catch (error) {
        console.error("Failed to save image to project:", error);
        toast.update(toastId, {
          render: "Failed to save image",
          type: "error",
          isLoading: false,
          autoClose: 3e3
        });
      }
    };
    const baseChat = /* @__PURE__ */ jsxs(
      "div",
      {
        ref,
        className: classNames(styles$1.BaseChat, "relative flex h-full w-full overflow-hidden"),
        "data-chat-visible": showChat,
        children: [
          /* @__PURE__ */ jsx(ClientOnly, { children: () => /* @__PURE__ */ jsx(Menu, {}) }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col lg:flex-row overflow-y-auto w-full h-full", children: [
            /* @__PURE__ */ jsxs("div", { className: classNames(styles$1.Chat, "flex flex-col flex-grow lg:min-w-[var(--chat-min-width)] h-full"), children: [
              !chatStarted && /* @__PURE__ */ jsxs("div", { id: "intro", className: "mt-[16vh] max-w-chat mx-auto text-center px-4 lg:px-0", children: [
                /* @__PURE__ */ jsx("h1", { className: "text-3xl lg:text-6xl font-bold text-bolt-elements-textPrimary mb-4 animate-fade-in", children: "Where ideas begin" }),
                /* @__PURE__ */ jsx("p", { className: "text-md lg:text-xl mb-8 text-bolt-elements-textSecondary animate-fade-in animation-delay-200", children: "Bring ideas to life in seconds or get help on existing projects." })
              ] }),
              /* @__PURE__ */ jsxs(
                StickToBottom,
                {
                  className: classNames("pt-6 px-2 sm:px-6 relative", {
                    "h-full flex flex-col modern-scrollbar": chatStarted
                  }),
                  resize: "smooth",
                  initial: "smooth",
                  children: [
                    /* @__PURE__ */ jsx(StickToBottom.Content, { className: "flex flex-col gap-4", children: /* @__PURE__ */ jsx(ClientOnly, { children: () => {
                      return chatStarted ? /* @__PURE__ */ jsx(
                        Messages,
                        {
                          className: "flex flex-col w-full flex-1 max-w-chat pb-6 mx-auto z-1",
                          messages,
                          isStreaming
                        }
                      ) : null;
                    } }) }),
                    /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: classNames("my-auto flex flex-col gap-2 w-full max-w-chat mx-auto z-prompt mb-6", {
                          "sticky bottom-2": chatStarted
                        }),
                        children: [
                          /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
                            deployAlert && /* @__PURE__ */ jsx(
                              DeployChatAlert,
                              {
                                alert: deployAlert,
                                clearAlert: () => clearDeployAlert?.(),
                                postMessage: (message) => {
                                  sendMessage?.({}, message);
                                  clearSupabaseAlert?.();
                                }
                              }
                            ),
                            supabaseAlert && /* @__PURE__ */ jsx(
                              SupabaseChatAlert,
                              {
                                alert: supabaseAlert,
                                clearAlert: () => clearSupabaseAlert?.(),
                                postMessage: (message) => {
                                  sendMessage?.({}, message);
                                  clearSupabaseAlert?.();
                                }
                              }
                            ),
                            actionAlert && /* @__PURE__ */ jsx(
                              ChatAlert,
                              {
                                alert: actionAlert,
                                clearAlert: () => clearAlert?.(),
                                postMessage: (message) => {
                                  sendMessage?.({}, message);
                                  clearAlert?.();
                                }
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsx(ScrollToBottom, {}),
                          progressAnnotations && /* @__PURE__ */ jsx(ProgressCompilation, { data: progressAnnotations }),
                          /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: classNames(
                                "relative bg-bolt-elements-background-depth-2 p-3 rounded-lg border border-bolt-elements-borderColor relative w-full max-w-chat mx-auto z-prompt"
                                /*
                                 * {
                                 *   'sticky bottom-2': chatStarted,
                                 * },
                                 */
                              ),
                              children: [
                                /* @__PURE__ */ jsxs("svg", { className: classNames(styles$1.PromptEffectContainer), children: [
                                  /* @__PURE__ */ jsxs("defs", { children: [
                                    /* @__PURE__ */ jsxs(
                                      "linearGradient",
                                      {
                                        id: "line-gradient",
                                        x1: "20%",
                                        y1: "0%",
                                        x2: "-14%",
                                        y2: "10%",
                                        gradientUnits: "userSpaceOnUse",
                                        gradientTransform: "rotate(-45)",
                                        children: [
                                          /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#b44aff", stopOpacity: "0%" }),
                                          /* @__PURE__ */ jsx("stop", { offset: "40%", stopColor: "#b44aff", stopOpacity: "80%" }),
                                          /* @__PURE__ */ jsx("stop", { offset: "50%", stopColor: "#b44aff", stopOpacity: "80%" }),
                                          /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#b44aff", stopOpacity: "0%" })
                                        ]
                                      }
                                    ),
                                    /* @__PURE__ */ jsxs("linearGradient", { id: "shine-gradient", children: [
                                      /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "white", stopOpacity: "0%" }),
                                      /* @__PURE__ */ jsx("stop", { offset: "40%", stopColor: "#ffffff", stopOpacity: "80%" }),
                                      /* @__PURE__ */ jsx("stop", { offset: "50%", stopColor: "#ffffff", stopOpacity: "80%" }),
                                      /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "white", stopOpacity: "0%" })
                                    ] })
                                  ] }),
                                  /* @__PURE__ */ jsx("rect", { className: classNames(styles$1.PromptEffectLine), pathLength: "100", strokeLinecap: "round" }),
                                  /* @__PURE__ */ jsx("rect", { className: classNames(styles$1.PromptShine), x: "48", y: "24", width: "70", height: "1" })
                                ] }),
                                /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(ClientOnly, { children: () => /* @__PURE__ */ jsxs("div", { className: isModelSettingsCollapsed ? "hidden" : "", children: [
                                  /* @__PURE__ */ jsx(
                                    ModelSelector,
                                    {
                                      model,
                                      setModel,
                                      modelList,
                                      provider,
                                      setProvider,
                                      providerList: providerList || PROVIDER_LIST,
                                      apiKeys,
                                      modelLoading: isModelLoading
                                    },
                                    provider?.name + ":" + modelList.length
                                  ),
                                  (providerList || []).length > 0 && provider && (!LOCAL_PROVIDERS.includes(provider.name) || "OpenAILike") && /* @__PURE__ */ jsx(
                                    APIKeyManager,
                                    {
                                      provider,
                                      apiKey: apiKeys[provider.name] || "",
                                      setApiKey: (key) => {
                                        onApiKeysChange(provider.name, key);
                                      }
                                    }
                                  )
                                ] }) }) }),
                                /* @__PURE__ */ jsx(
                                  FilePreview,
                                  {
                                    files: uploadedFiles,
                                    imageDataList,
                                    onRemove: (index) => {
                                      setUploadedFiles?.(uploadedFiles.filter((_, i) => i !== index));
                                      setImageDataList?.(imageDataList.filter((_, i) => i !== index));
                                    }
                                  }
                                ),
                                /* @__PURE__ */ jsx(ClientOnly, { children: () => /* @__PURE__ */ jsx(
                                  ScreenshotStateManager,
                                  {
                                    setUploadedFiles,
                                    setImageDataList,
                                    uploadedFiles,
                                    imageDataList
                                  }
                                ) }),
                                /* @__PURE__ */ jsxs(
                                  "div",
                                  {
                                    className: classNames(
                                      "relative shadow-xs border border-bolt-elements-borderColor backdrop-blur rounded-lg"
                                    ),
                                    children: [
                                      /* @__PURE__ */ jsx(
                                        "textarea",
                                        {
                                          ref: textareaRef,
                                          className: classNames(
                                            "w-full pl-4 pt-4 pr-16 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-sm",
                                            "transition-all duration-200",
                                            "hover:border-bolt-elements-focus"
                                          ),
                                          onDragEnter: (e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.border = "2px solid #1488fc";
                                          },
                                          onDragOver: (e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.border = "2px solid #1488fc";
                                          },
                                          onDragLeave: (e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.border = "1px solid var(--bolt-elements-borderColor)";
                                          },
                                          onDrop: (e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.border = "1px solid var(--bolt-elements-borderColor)";
                                            const files = Array.from(e.dataTransfer.files);
                                            files.forEach((file) => {
                                              if (file.type.startsWith("image/")) {
                                                const reader = new FileReader();
                                                reader.onload = async (ev) => {
                                                  const base64Image = ev.target?.result;
                                                  await saveImageToProject(file, base64Image);
                                                };
                                                reader.readAsDataURL(file);
                                              }
                                            });
                                          },
                                          onKeyDown: (event) => {
                                            if (event.key === "Enter") {
                                              if (event.shiftKey) {
                                                return;
                                              }
                                              event.preventDefault();
                                              if (isStreaming) {
                                                handleStop?.();
                                                return;
                                              }
                                              if (event.nativeEvent.isComposing) {
                                                return;
                                              }
                                              handleSendMessage?.(event);
                                            }
                                          },
                                          value: input,
                                          onChange: (event) => {
                                            handleInputChange?.(event);
                                          },
                                          onPaste: handlePaste,
                                          style: {
                                            minHeight: TEXTAREA_MIN_HEIGHT,
                                            maxHeight: TEXTAREA_MAX_HEIGHT
                                          },
                                          placeholder: "How can Bolt help you today?",
                                          translate: "no"
                                        }
                                      ),
                                      /* @__PURE__ */ jsx(ClientOnly, { children: () => /* @__PURE__ */ jsx(
                                        SendButton,
                                        {
                                          show: input.length > 0 || isStreaming || uploadedFiles.length > 0,
                                          isStreaming,
                                          disabled: !providerList || providerList.length === 0,
                                          onClick: (event) => {
                                            if (isStreaming) {
                                              handleStop?.();
                                              return;
                                            }
                                            if (input.length > 0 || uploadedFiles.length > 0) {
                                              handleSendMessage?.(event);
                                            }
                                          }
                                        }
                                      ) }),
                                      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-sm p-4 pt-2", children: [
                                        /* @__PURE__ */ jsxs("div", { className: "flex gap-1 items-center", children: [
                                          /* @__PURE__ */ jsx(IconButton, { title: "Upload file", className: "transition-all", onClick: () => handleFileUpload(), children: /* @__PURE__ */ jsx("div", { className: "i-ph:paperclip text-xl" }) }),
                                          /* @__PURE__ */ jsx(
                                            IconButton,
                                            {
                                              title: "Generate image with AI",
                                              className: "transition-all",
                                              onClick: () => setShowImageGen(true),
                                              children: /* @__PURE__ */ jsx("div", { className: "i-ph:image-square-duotone text-xl" })
                                            }
                                          ),
                                          /* @__PURE__ */ jsx(
                                            IconButton,
                                            {
                                              title: "Enhance prompt",
                                              disabled: input.length === 0 || enhancingPrompt,
                                              className: classNames("transition-all", enhancingPrompt ? "opacity-100" : ""),
                                              onClick: () => {
                                                enhancePrompt?.();
                                                toast.success("Prompt enhanced!");
                                              },
                                              children: enhancingPrompt ? /* @__PURE__ */ jsx("div", { className: "i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl animate-spin" }) : /* @__PURE__ */ jsx("div", { className: "i-bolt:stars text-xl" })
                                            }
                                          ),
                                          /* @__PURE__ */ jsx(
                                            SpeechRecognitionButton,
                                            {
                                              isListening,
                                              onStart: startListening,
                                              onStop: stopListening,
                                              disabled: isStreaming
                                            }
                                          ),
                                          chatStarted && /* @__PURE__ */ jsx(ClientOnly, { children: () => /* @__PURE__ */ jsx(ExportChatButton, { exportChat }) }),
                                          chatStarted && /* @__PURE__ */ jsx(
                                            IconButton,
                                            {
                                              title: "Save as Template",
                                              className: "transition-all",
                                              onClick: () => setShowSaveTemplate(true),
                                              children: /* @__PURE__ */ jsx("div", { className: "i-ph:stack-plus-duotone text-xl" })
                                            }
                                          ),
                                          /* @__PURE__ */ jsxs(
                                            IconButton,
                                            {
                                              title: "Model Settings",
                                              className: classNames("transition-all flex items-center gap-1", {
                                                "bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent": isModelSettingsCollapsed,
                                                "bg-bolt-elements-item-backgroundDefault text-bolt-elements-item-contentDefault": !isModelSettingsCollapsed
                                              }),
                                              onClick: () => setIsModelSettingsCollapsed(!isModelSettingsCollapsed),
                                              disabled: !providerList || providerList.length === 0,
                                              children: [
                                                /* @__PURE__ */ jsx("div", { className: `i-ph:caret-${isModelSettingsCollapsed ? "right" : "down"} text-lg` }),
                                                isModelSettingsCollapsed ? /* @__PURE__ */ jsx("span", { className: "text-xs", children: model }) : /* @__PURE__ */ jsx("span", {})
                                              ]
                                            }
                                          )
                                        ] }),
                                        input.length > 3 ? /* @__PURE__ */ jsxs("div", { className: "text-xs text-bolt-elements-textTertiary", children: [
                                          "Use ",
                                          /* @__PURE__ */ jsx("kbd", { className: "kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2", children: "Shift" }),
                                          " ",
                                          "+ ",
                                          /* @__PURE__ */ jsx("kbd", { className: "kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2", children: "Return" }),
                                          " ",
                                          "a new line"
                                        ] }) : null,
                                        /* @__PURE__ */ jsx(SupabaseConnection, {}),
                                        /* @__PURE__ */ jsx(ExpoQrModal, { open: qrModalOpen, onClose: () => setQrModalOpen(false) }),
                                        /* @__PURE__ */ jsx(
                                          ImageGenerateModal,
                                          {
                                            open: showImageGen,
                                            onClose: () => setShowImageGen(false),
                                            uploadedFiles,
                                            setUploadedFiles,
                                            imageDataList,
                                            setImageDataList,
                                            messages,
                                            chatModel: model,
                                            chatProvider: provider
                                          }
                                        ),
                                        model && provider && /* @__PURE__ */ jsx(
                                          SaveTemplateModal,
                                          {
                                            open: showSaveTemplate,
                                            onClose: () => setShowSaveTemplate(false),
                                            messages: messages ?? [],
                                            model,
                                            provider
                                          }
                                        )
                                      ] })
                                    ]
                                  }
                                )
                              ]
                            }
                          )
                        ]
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col justify-center", children: [
                !chatStarted && /* @__PURE__ */ jsxs("div", { className: "flex justify-center gap-2", children: [
                  ImportButtons(importChat),
                  /* @__PURE__ */ jsx(GitCloneButton, { importChat })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-5", children: [
                  !chatStarted && ExamplePrompts((event, messageInput) => {
                    if (isStreaming) {
                      handleStop?.();
                      return;
                    }
                    handleSendMessage?.(event, messageInput);
                  }),
                  !chatStarted && /* @__PURE__ */ jsx(StarterTemplates, {}),
                  !chatStarted && /* @__PURE__ */ jsx(UserTemplates, {})
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx(ClientOnly, { children: () => /* @__PURE__ */ jsx(
              Workbench,
              {
                actionRunner: actionRunner ?? {},
                chatStarted,
                isStreaming
              }
            ) })
          ] })
        ]
      }
    );
    return /* @__PURE__ */ jsx(TooltipPrimitive.Provider, { delayDuration: 200, children: baseChat });
  }
);
function ScrollToBottom() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  return !isAtBottom && /* @__PURE__ */ jsxs(
    "button",
    {
      className: "absolute z-50 top-[0%] translate-y-[-100%] text-4xl rounded-lg left-[50%] translate-x-[-50%] px-1.5 py-0.5 flex items-center gap-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary text-sm",
      onClick: () => scrollToBottom(),
      children: [
        "Go to last message",
        /* @__PURE__ */ jsx("span", { className: "i-ph:arrow-down animate-bounce" })
      ]
    }
  );
}

const Chat = undefined;

const chatStore = map({
  started: false,
  aborted: false,
  showChat: true
});

const HeaderActionButtons = undefined;

const ChatDescription = undefined;

function Header() {
  const chat = useStore(chatStore);
  return /* @__PURE__ */ jsxs(
    "header",
    {
      className: classNames("flex items-center p-5 border-b h-[var(--header-height)]", {
        "border-transparent": !chat.started,
        "border-bolt-elements-borderColor": chat.started
      }),
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer", children: [
          /* @__PURE__ */ jsx("div", { className: "i-ph:sidebar-simple-duotone text-xl" }),
          /* @__PURE__ */ jsxs("a", { href: "/", className: "text-2xl font-semibold text-accent flex items-center", children: [
            /* @__PURE__ */ jsx("img", { src: "/logo-light-styled.png", alt: "logo", className: "w-[90px] inline-block dark:hidden" }),
            /* @__PURE__ */ jsx("img", { src: "/logo-dark-styled.png", alt: "logo", className: "w-[90px] inline-block hidden dark:block" })
          ] })
        ] }),
        chat.started && // Display ChatDescription and HeaderActionButtons only when the chat has started.
        /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { className: "flex-1 px-4 truncate text-center text-bolt-elements-textPrimary", children: /* @__PURE__ */ jsx(ClientOnly, { children: () => /* @__PURE__ */ jsx(ChatDescription, {}) }) }),
          /* @__PURE__ */ jsx(ClientOnly, { children: () => /* @__PURE__ */ jsx("div", { className: "mr-1", children: /* @__PURE__ */ jsx(HeaderActionButtons, {}) }) })
        ] }),
        !chat.started && /* @__PURE__ */ jsx("div", { className: "flex-1" }),
        /* @__PURE__ */ jsx(ClientOnly, { children: () => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 ml-3", children: [
          /* @__PURE__ */ jsxs(
            "a",
            {
              href: "/skills",
              title: "Skills",
              className: "flex items-center gap-1.5 px-3 py-1.5 text-xs text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive rounded-lg transition-colors",
              children: [
                /* @__PURE__ */ jsx("div", { className: "i-ph:puzzle-piece text-base" }),
                /* @__PURE__ */ jsx("span", { children: "Skills" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "a",
            {
              href: "/projects",
              title: "My Projects",
              className: "flex items-center gap-1.5 px-3 py-1.5 text-xs text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive rounded-lg transition-colors",
              children: [
                /* @__PURE__ */ jsx("div", { className: "i-ph:chat-circle text-base" }),
                /* @__PURE__ */ jsx("span", { children: "Chats" })
              ]
            }
          ),
          /* @__PURE__ */ jsx(Form, { method: "post", action: "/api/auth/logout", children: /* @__PURE__ */ jsxs(
            "button",
            {
              type: "submit",
              title: "Sign out",
              className: "flex items-center gap-1.5 px-3 py-1.5 text-xs text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive rounded-lg transition-colors",
              children: [
                /* @__PURE__ */ jsx("div", { className: "i-ph:sign-out text-base" }),
                /* @__PURE__ */ jsx("span", { children: "Sign out" })
              ]
            }
          ) })
        ] }) })
      ]
    }
  );
}

const rayContainer = "e";
const lightRay = "g";
const ray1 = "h";
const ray2 = "j";
const ray3 = "l";
const ray4 = "n";
const ray5 = "p";
const ray6 = "r";
const ray7 = "t";
const ray8 = "v";
const styles = {
	rayContainer: rayContainer,
	lightRay: lightRay,
	ray1: ray1,
	ray2: ray2,
	ray3: ray3,
	ray4: ray4,
	ray5: ray5,
	ray6: ray6,
	ray7: ray7,
	ray8: ray8};

const BackgroundRays = () => {
  return /* @__PURE__ */ jsxs("div", { className: `${styles.rayContainer} `, children: [
    /* @__PURE__ */ jsx("div", { className: `${styles.lightRay} ${styles.ray1}` }),
    /* @__PURE__ */ jsx("div", { className: `${styles.lightRay} ${styles.ray2}` }),
    /* @__PURE__ */ jsx("div", { className: `${styles.lightRay} ${styles.ray3}` }),
    /* @__PURE__ */ jsx("div", { className: `${styles.lightRay} ${styles.ray4}` }),
    /* @__PURE__ */ jsx("div", { className: `${styles.lightRay} ${styles.ray5}` }),
    /* @__PURE__ */ jsx("div", { className: `${styles.lightRay} ${styles.ray6}` }),
    /* @__PURE__ */ jsx("div", { className: `${styles.lightRay} ${styles.ray7}` }),
    /* @__PURE__ */ jsx("div", { className: `${styles.lightRay} ${styles.ray8}` })
  ] });
};

const meta$1 = () => {
  return [
    { title: "Sitara Builder" },
    { name: "description", content: "Build full-stack web apps instantly with Sitara, your AI development assistant" }
  ];
};
async function loader$5({ request, context }) {
  await requireAuth(request, context.cloudflare?.env);
  return json({});
}
function Index$1() {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full w-full bg-bolt-elements-background-depth-1", children: [
    /* @__PURE__ */ jsx(BackgroundRays, {}),
    /* @__PURE__ */ jsx(Header, {}),
    /* @__PURE__ */ jsx(ClientOnly, { fallback: /* @__PURE__ */ jsx(BaseChat, {}), children: () => /* @__PURE__ */ jsx(Chat, {}) })
  ] });
}

const route40 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: Index$1,
  loader: loader$5,
  meta: meta$1
}, Symbol.toStringTag, { value: 'Module' }));

async function loader$4(args) {
  await requireAuth(args.request, args.context.cloudflare?.env);
  return json({ id: args.params.id });
}

const route37 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: Index$1,
  loader: loader$4
}, Symbol.toStringTag, { value: 'Module' }));

async function loader$3({ request, context }) {
  const user = await requireAuth(request, context.cloudflare?.env);
  const chats = await getChats(user.userId, user.role);
  return json({ chats, role: user.role });
}
function formatTokens(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function formatCost(n) {
  if (!n) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}
function ModelBadges({ models }) {
  const entries = Object.values(models || {});
  if (!entries.length) {
    return /* @__PURE__ */ jsx("span", { className: "text-gray-600 text-xs", children: "—" });
  }
  return /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: entries.map((m) => /* @__PURE__ */ jsxs(
    "span",
    {
      className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs",
      title: `Prompt: ${m.promptTokens} | Completion: ${m.completionTokens} | Cost: ${formatCost(m.cost || 0)}`,
      children: [
        m.model,
        /* @__PURE__ */ jsx("span", { className: "text-purple-400/60", children: "·" }),
        formatTokens(m.totalTokens)
      ]
    },
    `${m.model}:${m.provider}`
  )) });
}
function UrlLink({ href, label }) {
  if (!href) {
    return /* @__PURE__ */ jsx("span", { className: "text-gray-600 text-xs", children: "—" });
  }
  return /* @__PURE__ */ jsx(
    "a",
    {
      href,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 truncate max-w-[140px]",
      title: href,
      children: label
    }
  );
}
function ChatsPage() {
  const { chats, role } = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-[#0a0a0f] text-white", children: [
    /* @__PURE__ */ jsxs("div", { className: "border-b border-white/[0.08] px-6 py-4 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("a", { href: "/", className: "text-gray-400 hover:text-white transition-colors", children: /* @__PURE__ */ jsx("div", { className: "i-ph:arrow-left text-lg" }) }),
        /* @__PURE__ */ jsx("h1", { className: "text-lg font-semibold", children: "Chats" }),
        role === "super_admin" && /* @__PURE__ */ jsx("span", { className: "px-2 py-0.5 rounded-full text-xs bg-purple-500/20 border border-purple-500/30 text-purple-300", children: "All Clients" })
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "text-sm text-gray-500", children: [
        chats.length,
        " chat",
        chats.length !== 1 ? "s" : ""
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "p-6", children: chats.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-24 text-gray-500", children: [
      /* @__PURE__ */ jsx("div", { className: "i-ph:chat-circle text-5xl mb-3 opacity-30" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm", children: "No chats yet. Start a conversation to see it here." })
    ] }) : /* @__PURE__ */ jsx("div", { className: "overflow-x-auto rounded-xl border border-white/[0.08]", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-white/[0.08] bg-white/[0.02]", children: [
        /* @__PURE__ */ jsx("th", { className: "text-left px-4 py-3 text-gray-400 font-medium", children: "Chat" }),
        /* @__PURE__ */ jsx("th", { className: "text-left px-4 py-3 text-gray-400 font-medium", children: "Created By" }),
        /* @__PURE__ */ jsx("th", { className: "text-left px-4 py-3 text-gray-400 font-medium", children: "Models & Tokens" }),
        /* @__PURE__ */ jsx("th", { className: "text-right px-4 py-3 text-gray-400 font-medium", children: "Total Tokens" }),
        /* @__PURE__ */ jsx("th", { className: "text-right px-4 py-3 text-gray-400 font-medium", children: "Total Cost" }),
        /* @__PURE__ */ jsx("th", { className: "text-left px-4 py-3 text-gray-400 font-medium", children: "GitHub" }),
        /* @__PURE__ */ jsx("th", { className: "text-left px-4 py-3 text-gray-400 font-medium", children: "Netlify" }),
        /* @__PURE__ */ jsx("th", { className: "text-left px-4 py-3 text-gray-400 font-medium", children: "Vercel" }),
        /* @__PURE__ */ jsx("th", { className: "text-left px-4 py-3 text-gray-400 font-medium", children: "Last Active" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: chats.map((c, i) => /* @__PURE__ */ jsxs(
        "tr",
        {
          className: `border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`,
          children: [
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(
              "a",
              {
                href: `/chat/${c.trackingId}`,
                className: "font-medium text-white hover:text-purple-300 transition-colors",
                children: c.name || c.trackingId
              }
            ) }),
            /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
              /* @__PURE__ */ jsx("div", { className: "text-gray-300", children: c.client?.clientName }),
              /* @__PURE__ */ jsx("div", { className: "text-gray-500 text-xs", children: c.client?.productName }),
              c.createdBy?.name && /* @__PURE__ */ jsxs("div", { className: "text-gray-700 text-xs mt-0.5", children: [
                "by ",
                c.createdBy.name
              ] })
            ] }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(ModelBadges, { models: c.models }) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right tabular-nums text-gray-300", children: formatTokens(c.totalTokens || 0) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right tabular-nums text-emerald-300", children: formatCost(c.totalCost || 0) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(UrlLink, { href: c.githubUrl, label: "GitHub" }) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(UrlLink, { href: c.netlifyUrl, label: "Netlify" }) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(UrlLink, { href: c.vercelUrl, label: "Vercel" }) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-gray-500 text-xs whitespace-nowrap", children: new Date(c.updatedAt).toLocaleDateString() })
          ]
        },
        c.trackingId
      )) })
    ] }) }) })
  ] });
}

const route38 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: ChatsPage,
  loader: loader$3
}, Symbol.toStringTag, { value: 'Module' }));

async function loader$2({ request, context }) {
  const user = await requireAuth(request, context.cloudflare?.env);
  const [customSkills, disabledBuiltins] = await Promise.all([listCustomSkills(), getDisabledBuiltinSkillNames()]);
  const builtIn = promptSkills.map((s) => ({
    name: s.name,
    description: s.description,
    enabled: !disabledBuiltins.includes(s.name)
  }));
  return json({ customSkills, builtIn, isSuperAdmin: user.role === "super_admin" });
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function SkillsPage() {
  const { customSkills, builtIn, isSuperAdmin } = useLoaderData();
  const revalidator = useRevalidator();
  const [gitUrl, setGitUrl] = useState("");
  const [triggers, setTriggers] = useState("");
  const [alwaysLoad, setAlwaysLoad] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);
  const callApi = async (payload) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setMessage({ type: "error", text: data.error || `Request failed (${response.status})` });
      } else {
        if (data.skill) {
          setMessage({ type: "success", text: `Skill "${data.skill.name}" added.` });
          setGitUrl("");
          setTriggers("");
          setAlwaysLoad(false);
        }
        revalidator.revalidate();
      }
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Request failed" });
    } finally {
      setBusy(false);
    }
  };
  const extraOptions = {
    ...triggers.trim() ? { triggers: triggers.trim() } : {},
    ...alwaysLoad ? { alwaysLoad: true } : {}
  };
  const importFromGit = () => {
    if (gitUrl.trim()) {
      callApi({ intent: "add-git", url: gitUrl.trim(), ...extraOptions });
    }
  };
  const importFromFile = async (file) => {
    if (/\.zip$/i.test(file.name)) {
      const dataBase64 = await fileToBase64(file);
      callApi({ intent: "add-zip", dataBase64, filename: file.name, ...extraOptions });
    } else {
      const content = await file.text();
      callApi({ intent: "add-md", content, filename: file.name, ...extraOptions });
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-[#0a0a0f] text-white", children: [
    /* @__PURE__ */ jsxs("div", { className: "border-b border-white/[0.08] px-6 py-4 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("a", { href: "/", className: "text-gray-400 hover:text-white transition-colors", children: /* @__PURE__ */ jsx("div", { className: "i-ph:arrow-left text-lg" }) }),
        /* @__PURE__ */ jsx("h1", { className: "text-lg font-semibold", children: "Skills" }),
        isSuperAdmin && /* @__PURE__ */ jsx("span", { className: "px-2 py-0.5 rounded-full text-xs bg-purple-500/20 border border-purple-500/30 text-purple-300", children: "Admin" })
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "text-sm text-gray-500", children: [
        builtIn.length,
        " built-in · ",
        customSkills.length,
        " custom"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "p-6 max-w-5xl mx-auto space-y-8", children: [
      isSuperAdmin && /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("div", { className: "i-ph:plus-circle text-lg text-purple-400" }),
          /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold", children: "Add a skill" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500", children: "Claude-compatible SKILL.md — via GitHub URL, .zip, or .md upload" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: gitUrl,
              onChange: (e) => setGitUrl(e.target.value),
              onKeyDown: (e) => e.key === "Enter" && importFromGit(),
              placeholder: "https://github.com/owner/repo  or  …/tree/main/skills/my-skill  or a direct SKILL.md link",
              className: "flex-1 px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: importFromGit,
              disabled: busy || !gitUrl.trim(),
              className: "px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all",
              children: busy ? "Importing…" : "Import from Git"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => fileInputRef.current?.click(),
              disabled: busy,
              className: "px-4 py-2.5 text-sm font-medium border border-white/[0.15] hover:border-purple-500 disabled:opacity-40 rounded-xl transition-colors",
              children: "Upload .zip / .md"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              ref: fileInputRef,
              type: "file",
              accept: ".md,.zip,.markdown",
              className: "hidden",
              onChange: (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  importFromFile(file);
                }
                e.target.value = "";
              }
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: triggers,
              onChange: (e) => setTriggers(e.target.value),
              placeholder: "Optional trigger regex, e.g. pdf|invoice|report (defaults to the skill name)",
              className: "flex-1 px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-xl text-xs placeholder-gray-600 focus:outline-none focus:border-purple-500"
            }
          ),
          /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-xs text-gray-400 cursor-pointer whitespace-nowrap", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: alwaysLoad,
                onChange: (e) => setAlwaysLoad(e.target.checked),
                className: "accent-purple-500"
              }
            ),
            "Always load (every request)"
          ] })
        ] }),
        message && /* @__PURE__ */ jsx(
          "div",
          {
            className: `text-sm px-4 py-2.5 rounded-xl border ${message.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`,
            children: message.text
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-gray-300 mb-3", children: "Custom skills" }),
        customSkills.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-12 text-gray-500 rounded-xl border border-white/[0.08]", children: [
          /* @__PURE__ */ jsx("div", { className: "i-ph:puzzle-piece text-4xl mb-2 opacity-30" }),
          /* @__PURE__ */ jsxs("p", { className: "text-sm", children: [
            "No custom skills yet.",
            isSuperAdmin ? " Import one from a GitHub URL or upload a SKILL.md." : ""
          ] })
        ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: customSkills.map((skill) => /* @__PURE__ */ jsxs(
          "div",
          {
            className: `flex items-center gap-4 rounded-xl border border-white/[0.08] px-4 py-3 ${skill.enabled ? "bg-white/[0.02]" : "bg-white/[0.01] opacity-60"}`,
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-medium text-sm", children: skill.name }),
                  /* @__PURE__ */ jsx("span", { className: "px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-blue-500/10 border border-blue-500/20 text-blue-300", children: skill.source?.type }),
                  skill.alwaysLoad && /* @__PURE__ */ jsx("span", { className: "px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-amber-500/10 border border-amber-500/20 text-amber-300", children: "always" })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 truncate mt-0.5", children: skill.description }),
                /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-gray-700 mt-0.5", children: [
                  Math.round(skill.bodyChars / 4),
                  " tokens approx · by ",
                  skill.createdBy?.email,
                  " ·",
                  " ",
                  new Date(skill.updatedAt).toLocaleDateString()
                ] })
              ] }),
              isSuperAdmin && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => callApi({ intent: "toggle", name: skill.name, enabled: !skill.enabled }),
                    disabled: busy,
                    className: `px-3 py-1.5 text-xs rounded-lg border transition-colors ${skill.enabled ? "border-green-500/30 text-green-300 hover:bg-green-500/10" : "border-white/[0.15] text-gray-400 hover:border-white/[0.3]"}`,
                    children: skill.enabled ? "Enabled" : "Disabled"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => {
                      if (confirm(`Delete skill "${skill.name}"?`)) {
                        callApi({ intent: "delete", name: skill.name });
                      }
                    },
                    disabled: busy,
                    className: "px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors",
                    children: "Delete"
                  }
                )
              ] })
            ]
          },
          skill.name
        )) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-gray-300 mb-3", children: "Built-in skills" }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: builtIn.map((skill) => /* @__PURE__ */ jsxs(
          "div",
          {
            className: `rounded-xl border border-white/[0.08] px-4 py-3 ${skill.enabled ? "bg-white/[0.02]" : "bg-white/[0.01] opacity-60"}`,
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx("span", { className: "font-medium text-sm", children: skill.name }),
                /* @__PURE__ */ jsx("span", { className: "px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-purple-500/10 border border-purple-500/20 text-purple-300", children: "built-in" }),
                !skill.enabled && /* @__PURE__ */ jsx("span", { className: "px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-red-500/10 border border-red-500/20 text-red-300", children: "disabled" }),
                isSuperAdmin && /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => callApi({ intent: "toggle-builtin", name: skill.name, enabled: !skill.enabled }),
                    disabled: busy,
                    className: `ml-auto px-3 py-1 text-xs rounded-lg border transition-colors shrink-0 ${skill.enabled ? "border-green-500/30 text-green-300 hover:bg-green-500/10" : "border-white/[0.15] text-gray-400 hover:border-white/[0.3]"}`,
                    children: skill.enabled ? "Enabled" : "Disabled"
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 mt-0.5", children: skill.description })
            ]
          },
          skill.name
        )) })
      ] })
    ] })
  ] });
}

const route39 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: SkillsPage,
  loader: loader$2
}, Symbol.toStringTag, { value: 'Module' }));

async function loader$1({ request, context }) {
  const token = getAuthToken(request);
  if (token) {
    const user = await verifyJwt(token, context.cloudflare?.env);
    if (user) throw redirect("/");
  }
  return json({});
}
async function action({ request, context }) {
  const env = context.cloudflare?.env;
  const formData = await request.formData();
  const email = (formData.get("email") || "").toString().trim();
  const password = (formData.get("password") || "").toString();
  if (!email || !password) {
    return json({ error: "Email and password are required." }, { status: 400 });
  }
  let user;
  try {
    user = await findUserByEmail(email);
  } catch {
    return json({ error: "Unable to connect to database. Please try again." }, { status: 503 });
  }
  if (!user) {
    return json({ error: "Invalid email or password." }, { status: 401 });
  }
  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    return json({ error: "Invalid email or password." }, { status: 401 });
  }
  const { allowed, reason } = checkAccess(user);
  if (!allowed) {
    return json({ error: reason ?? "Access denied." }, { status: 403 });
  }
  const token = await signJwt(
    {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      automations: user.automations
    },
    env
  );
  throw redirect("/", {
    headers: { "Set-Cookie": setAuthCookie(token) }
  });
}
function LoginPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md", children: [
    /* @__PURE__ */ jsxs("div", { className: "text-center mb-10", children: [
      /* @__PURE__ */ jsx("div", { className: "inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 mb-4 shadow-lg shadow-purple-500/25", children: /* @__PURE__ */ jsx("svg", { width: "32", height: "32", viewBox: "0 0 32 32", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: /* @__PURE__ */ jsx("path", { d: "M8 8L16 4L24 8V16L16 28L8 16V8Z", fill: "white", fillOpacity: "0.9" }) }) }),
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-white tracking-tight", children: "Sitara Builder" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500 mt-1", children: "Sign in to continue" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "bg-[#111118] border border-white/[0.08] rounded-2xl p-8 shadow-2xl", children: /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-5", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-300 mb-2", children: "Email" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "email",
            name: "email",
            type: "email",
            autoComplete: "email",
            required: true,
            className: "w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors",
            placeholder: "you@example.com"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-300 mb-2", children: "Password" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "password",
            name: "password",
            type: "password",
            autoComplete: "current-password",
            required: true,
            className: "w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors",
            placeholder: "Enter your password"
          }
        )
      ] }),
      actionData?.error && /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl", children: [
        /* @__PURE__ */ jsx(
          "svg",
          {
            className: "w-4 h-4 text-red-400 mt-0.5 shrink-0",
            fill: "none",
            viewBox: "0 0 24 24",
            stroke: "currentColor",
            children: /* @__PURE__ */ jsx(
              "path",
              {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              }
            )
          }
        ),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-red-400", children: actionData.error })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "submit",
          disabled: isSubmitting,
          className: "w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#111118]",
          children: isSubmitting ? /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center justify-center gap-2", children: [
            /* @__PURE__ */ jsxs("svg", { className: "animate-spin w-4 h-4", fill: "none", viewBox: "0 0 24 24", children: [
              /* @__PURE__ */ jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
              /* @__PURE__ */ jsx(
                "path",
                {
                  className: "opacity-75",
                  fill: "currentColor",
                  d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                }
              )
            ] }),
            "Signing in…"
          ] }) : "Sign in"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxs("p", { className: "text-center text-xs text-gray-600 mt-6", children: [
      "© ",
      (/* @__PURE__ */ new Date()).getFullYear(),
      " Sitara Builder. All rights reserved."
    ] })
  ] }) });
}

const route41 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  action,
  default: LoginPage,
  loader: loader$1
}, Symbol.toStringTag, { value: 'Module' }));

const GitUrlImport = undefined;

const meta = () => {
  return [
    { title: "Sitara Builder" },
    { name: "description", content: "Build full-stack web apps instantly with Sitara, your AI development assistant" }
  ];
};
async function loader(args) {
  await requireAuth(args.request, args.context.cloudflare?.env);
  return json({ url: args.params.url });
}
function Index() {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full w-full bg-bolt-elements-background-depth-1", children: [
    /* @__PURE__ */ jsx(BackgroundRays, {}),
    /* @__PURE__ */ jsx(Header, {}),
    /* @__PURE__ */ jsx(ClientOnly, { fallback: /* @__PURE__ */ jsx(BaseChat, {}), children: () => /* @__PURE__ */ jsx(GitUrlImport, {}) })
  ] });
}

const route42 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: Index,
  loader,
  meta
}, Symbol.toStringTag, { value: 'Module' }));

const serverManifest = {'entry':{'module':'/assets/entry.client-BRHsSCu_.js','imports':['/assets/components-Dwsc2uka.js'],'css':[]},'routes':{'root':{'id':'root','parentId':undefined,'path':'','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/root-CMI9uKCT.js','imports':['/assets/components-Dwsc2uka.js','/assets/client-only-DOmRX3_0.js'],'css':['/assets/root-BGbzvQfm.css']},'routes/api.image-prompt-suggest':{'id':'routes/api.image-prompt-suggest','parentId':'root','path':'api/image-prompt-suggest','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.image-prompt-suggest-l0sNRNKZ.js','imports':[],'css':[]},'routes/webcontainer.connect.$id':{'id':'routes/webcontainer.connect.$id','parentId':'root','path':'webcontainer/connect/:id','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/webcontainer.connect._id-l0sNRNKZ.js','imports':[],'css':[]},'routes/webcontainer.preview.$id':{'id':'routes/webcontainer.preview.$id','parentId':'root','path':'webcontainer/preview/:id','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/webcontainer.preview._id-CFDPOoZw.js','imports':['/assets/components-Dwsc2uka.js'],'css':[]},'routes/api.system.process-info':{'id':'routes/api.system.process-info','parentId':'root','path':'api/system/process-info','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.system.process-info-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.sketchfab-download':{'id':'routes/api.sketchfab-download','parentId':'root','path':'api/sketchfab-download','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.sketchfab-download-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.supabase.variables':{'id':'routes/api.supabase.variables','parentId':'routes/api.supabase','path':'variables','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.supabase.variables-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.system.diagnostics':{'id':'routes/api.system.diagnostics','parentId':'root','path':'api/system/diagnostics','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.system.diagnostics-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.system.memory-info':{'id':'routes/api.system.memory-info','parentId':'root','path':'api/system/memory-info','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.system.memory-info-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.template-summarize':{'id':'routes/api.template-summarize','parentId':'root','path':'api/template-summarize','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.template-summarize-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.models.$provider':{'id':'routes/api.models.$provider','parentId':'routes/api.models','path':':provider','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.models._provider-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.sketchfab-search':{'id':'routes/api.sketchfab-search','parentId':'root','path':'api/sketchfab-search','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.sketchfab-search-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.system.disk-info':{'id':'routes/api.system.disk-info','parentId':'root','path':'api/system/disk-info','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.system.disk-info-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.export-api-keys':{'id':'routes/api.export-api-keys','parentId':'root','path':'api/export-api-keys','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.export-api-keys-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.github-template':{'id':'routes/api.github-template','parentId':'root','path':'api/github-template','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.github-template-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.system.app-info':{'id':'routes/api.system.app-info','parentId':'root','path':'api/system/app-info','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.system.app-info-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.system.git-info':{'id':'routes/api.system.git-info','parentId':'root','path':'api/system/git-info','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.system.git-info-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.image-generate':{'id':'routes/api.image-generate','parentId':'root','path':'api/image-generate','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.image-generate-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.netlify-deploy':{'id':'routes/api.netlify-deploy','parentId':'root','path':'api/netlify-deploy','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.netlify-deploy-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.project-update':{'id':'routes/api.project-update','parentId':'root','path':'api/project-update','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.project-update-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.sketchfab-auto':{'id':'routes/api.sketchfab-auto','parentId':'root','path':'api/sketchfab-auto','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.sketchfab-auto-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.supabase.query':{'id':'routes/api.supabase.query','parentId':'routes/api.supabase','path':'query','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.supabase.query-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.check-env-key':{'id':'routes/api.check-env-key','parentId':'root','path':'api/check-env-key','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.check-env-key-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.vercel-deploy':{'id':'routes/api.vercel-deploy','parentId':'root','path':'api/vercel-deploy','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.vercel-deploy-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.auth.logout':{'id':'routes/api.auth.logout','parentId':'root','path':'api/auth/logout','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.auth.logout-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.git-proxy.$':{'id':'routes/api.git-proxy.$','parentId':'root','path':'api/git-proxy/*','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.git-proxy._-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.image-name':{'id':'routes/api.image-name','parentId':'root','path':'api/image-name','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.image-name-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.enhancer':{'id':'routes/api.enhancer','parentId':'root','path':'api/enhancer','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.enhancer-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.projects':{'id':'routes/api.projects','parentId':'root','path':'api/projects','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.projects-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.supabase':{'id':'routes/api.supabase','parentId':'root','path':'api/supabase','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.supabase-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.clients':{'id':'routes/api.clients','parentId':'root','path':'api/clients','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.clients-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.llmcall':{'id':'routes/api.llmcall','parentId':'root','path':'api/llmcall','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.llmcall-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.health':{'id':'routes/api.health','parentId':'root','path':'api/health','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.health-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.models':{'id':'routes/api.models','parentId':'root','path':'api/models','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.models-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.skills':{'id':'routes/api.skills','parentId':'root','path':'api/skills','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.skills-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.update':{'id':'routes/api.update','parentId':'root','path':'api/update','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.update-l0sNRNKZ.js','imports':[],'css':[]},'routes/api.chat':{'id':'routes/api.chat','parentId':'root','path':'api/chat','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':false,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/api.chat-l0sNRNKZ.js','imports':[],'css':[]},'routes/chat.$id':{'id':'routes/chat.$id','parentId':'root','path':'chat/:id','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/chat._id-DFLXZRos.js','imports':['/assets/_index-fGTVN_jX.js','/assets/components-Dwsc2uka.js','/assets/client-only-DOmRX3_0.js','/assets/Header-BrxSbzC7.js'],'css':['/assets/Header-CI-kvXcR.css']},'routes/projects':{'id':'routes/projects','parentId':'root','path':'projects','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/projects-DviP_nW4.js','imports':['/assets/components-Dwsc2uka.js'],'css':[]},'routes/skills':{'id':'routes/skills','parentId':'root','path':'skills','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/skills-D_rCuti8.js','imports':['/assets/components-Dwsc2uka.js'],'css':[]},'routes/_index':{'id':'routes/_index','parentId':'root','path':undefined,'index':true,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/_index-fGTVN_jX.js','imports':['/assets/components-Dwsc2uka.js','/assets/client-only-DOmRX3_0.js','/assets/Header-BrxSbzC7.js'],'css':['/assets/Header-CI-kvXcR.css']},'routes/login':{'id':'routes/login','parentId':'root','path':'login','index':undefined,'caseSensitive':undefined,'hasAction':true,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/login-D3fMEbOY.js','imports':['/assets/components-Dwsc2uka.js'],'css':[]},'routes/git':{'id':'routes/git','parentId':'root','path':'git','index':undefined,'caseSensitive':undefined,'hasAction':false,'hasLoader':true,'hasClientAction':false,'hasClientLoader':false,'hasErrorBoundary':false,'module':'/assets/git-DjJ7mM73.js','imports':['/assets/components-Dwsc2uka.js','/assets/client-only-DOmRX3_0.js','/assets/Header-BrxSbzC7.js'],'css':['/assets/Header-CI-kvXcR.css']}},'url':'/assets/manifest-67c2b3a6.js','version':'67c2b3a6'};

/**
       * `mode` is only relevant for the old Remix compiler but
       * is included here to satisfy the `ServerBuild` typings.
       */
      const mode = "production";
      const assetsBuildDirectory = "build\\client";
      const basename = "/";
      const future = {"v3_fetcherPersist":true,"v3_relativeSplatPath":true,"v3_throwAbortReason":true,"v3_routeConfig":false,"v3_singleFetch":false,"v3_lazyRouteDiscovery":true,"unstable_optimizeDeps":false};
      const isSpaMode = false;
      const publicPath = "/";
      const entry = { module: entryServer };
      const routes = {
        "root": {
          id: "root",
          parentId: undefined,
          path: "",
          index: undefined,
          caseSensitive: undefined,
          module: route0
        },
  "routes/api.image-prompt-suggest": {
          id: "routes/api.image-prompt-suggest",
          parentId: "root",
          path: "api/image-prompt-suggest",
          index: undefined,
          caseSensitive: undefined,
          module: route1
        },
  "routes/webcontainer.connect.$id": {
          id: "routes/webcontainer.connect.$id",
          parentId: "root",
          path: "webcontainer/connect/:id",
          index: undefined,
          caseSensitive: undefined,
          module: route2
        },
  "routes/webcontainer.preview.$id": {
          id: "routes/webcontainer.preview.$id",
          parentId: "root",
          path: "webcontainer/preview/:id",
          index: undefined,
          caseSensitive: undefined,
          module: route3
        },
  "routes/api.system.process-info": {
          id: "routes/api.system.process-info",
          parentId: "root",
          path: "api/system/process-info",
          index: undefined,
          caseSensitive: undefined,
          module: route4
        },
  "routes/api.sketchfab-download": {
          id: "routes/api.sketchfab-download",
          parentId: "root",
          path: "api/sketchfab-download",
          index: undefined,
          caseSensitive: undefined,
          module: route5
        },
  "routes/api.supabase.variables": {
          id: "routes/api.supabase.variables",
          parentId: "routes/api.supabase",
          path: "variables",
          index: undefined,
          caseSensitive: undefined,
          module: route6
        },
  "routes/api.system.diagnostics": {
          id: "routes/api.system.diagnostics",
          parentId: "root",
          path: "api/system/diagnostics",
          index: undefined,
          caseSensitive: undefined,
          module: route7
        },
  "routes/api.system.memory-info": {
          id: "routes/api.system.memory-info",
          parentId: "root",
          path: "api/system/memory-info",
          index: undefined,
          caseSensitive: undefined,
          module: route8
        },
  "routes/api.template-summarize": {
          id: "routes/api.template-summarize",
          parentId: "root",
          path: "api/template-summarize",
          index: undefined,
          caseSensitive: undefined,
          module: route9
        },
  "routes/api.models.$provider": {
          id: "routes/api.models.$provider",
          parentId: "routes/api.models",
          path: ":provider",
          index: undefined,
          caseSensitive: undefined,
          module: route10
        },
  "routes/api.sketchfab-search": {
          id: "routes/api.sketchfab-search",
          parentId: "root",
          path: "api/sketchfab-search",
          index: undefined,
          caseSensitive: undefined,
          module: route11
        },
  "routes/api.system.disk-info": {
          id: "routes/api.system.disk-info",
          parentId: "root",
          path: "api/system/disk-info",
          index: undefined,
          caseSensitive: undefined,
          module: route12
        },
  "routes/api.export-api-keys": {
          id: "routes/api.export-api-keys",
          parentId: "root",
          path: "api/export-api-keys",
          index: undefined,
          caseSensitive: undefined,
          module: route13
        },
  "routes/api.github-template": {
          id: "routes/api.github-template",
          parentId: "root",
          path: "api/github-template",
          index: undefined,
          caseSensitive: undefined,
          module: route14
        },
  "routes/api.system.app-info": {
          id: "routes/api.system.app-info",
          parentId: "root",
          path: "api/system/app-info",
          index: undefined,
          caseSensitive: undefined,
          module: route15
        },
  "routes/api.system.git-info": {
          id: "routes/api.system.git-info",
          parentId: "root",
          path: "api/system/git-info",
          index: undefined,
          caseSensitive: undefined,
          module: route16
        },
  "routes/api.image-generate": {
          id: "routes/api.image-generate",
          parentId: "root",
          path: "api/image-generate",
          index: undefined,
          caseSensitive: undefined,
          module: route17
        },
  "routes/api.netlify-deploy": {
          id: "routes/api.netlify-deploy",
          parentId: "root",
          path: "api/netlify-deploy",
          index: undefined,
          caseSensitive: undefined,
          module: route18
        },
  "routes/api.project-update": {
          id: "routes/api.project-update",
          parentId: "root",
          path: "api/project-update",
          index: undefined,
          caseSensitive: undefined,
          module: route19
        },
  "routes/api.sketchfab-auto": {
          id: "routes/api.sketchfab-auto",
          parentId: "root",
          path: "api/sketchfab-auto",
          index: undefined,
          caseSensitive: undefined,
          module: route20
        },
  "routes/api.supabase.query": {
          id: "routes/api.supabase.query",
          parentId: "routes/api.supabase",
          path: "query",
          index: undefined,
          caseSensitive: undefined,
          module: route21
        },
  "routes/api.check-env-key": {
          id: "routes/api.check-env-key",
          parentId: "root",
          path: "api/check-env-key",
          index: undefined,
          caseSensitive: undefined,
          module: route22
        },
  "routes/api.vercel-deploy": {
          id: "routes/api.vercel-deploy",
          parentId: "root",
          path: "api/vercel-deploy",
          index: undefined,
          caseSensitive: undefined,
          module: route23
        },
  "routes/api.auth.logout": {
          id: "routes/api.auth.logout",
          parentId: "root",
          path: "api/auth/logout",
          index: undefined,
          caseSensitive: undefined,
          module: route24
        },
  "routes/api.git-proxy.$": {
          id: "routes/api.git-proxy.$",
          parentId: "root",
          path: "api/git-proxy/*",
          index: undefined,
          caseSensitive: undefined,
          module: route25
        },
  "routes/api.image-name": {
          id: "routes/api.image-name",
          parentId: "root",
          path: "api/image-name",
          index: undefined,
          caseSensitive: undefined,
          module: route26
        },
  "routes/api.enhancer": {
          id: "routes/api.enhancer",
          parentId: "root",
          path: "api/enhancer",
          index: undefined,
          caseSensitive: undefined,
          module: route27
        },
  "routes/api.projects": {
          id: "routes/api.projects",
          parentId: "root",
          path: "api/projects",
          index: undefined,
          caseSensitive: undefined,
          module: route28
        },
  "routes/api.supabase": {
          id: "routes/api.supabase",
          parentId: "root",
          path: "api/supabase",
          index: undefined,
          caseSensitive: undefined,
          module: route29
        },
  "routes/api.clients": {
          id: "routes/api.clients",
          parentId: "root",
          path: "api/clients",
          index: undefined,
          caseSensitive: undefined,
          module: route30
        },
  "routes/api.llmcall": {
          id: "routes/api.llmcall",
          parentId: "root",
          path: "api/llmcall",
          index: undefined,
          caseSensitive: undefined,
          module: route31
        },
  "routes/api.health": {
          id: "routes/api.health",
          parentId: "root",
          path: "api/health",
          index: undefined,
          caseSensitive: undefined,
          module: route32
        },
  "routes/api.models": {
          id: "routes/api.models",
          parentId: "root",
          path: "api/models",
          index: undefined,
          caseSensitive: undefined,
          module: route33
        },
  "routes/api.skills": {
          id: "routes/api.skills",
          parentId: "root",
          path: "api/skills",
          index: undefined,
          caseSensitive: undefined,
          module: route34
        },
  "routes/api.update": {
          id: "routes/api.update",
          parentId: "root",
          path: "api/update",
          index: undefined,
          caseSensitive: undefined,
          module: route35
        },
  "routes/api.chat": {
          id: "routes/api.chat",
          parentId: "root",
          path: "api/chat",
          index: undefined,
          caseSensitive: undefined,
          module: route36
        },
  "routes/chat.$id": {
          id: "routes/chat.$id",
          parentId: "root",
          path: "chat/:id",
          index: undefined,
          caseSensitive: undefined,
          module: route37
        },
  "routes/projects": {
          id: "routes/projects",
          parentId: "root",
          path: "projects",
          index: undefined,
          caseSensitive: undefined,
          module: route38
        },
  "routes/skills": {
          id: "routes/skills",
          parentId: "root",
          path: "skills",
          index: undefined,
          caseSensitive: undefined,
          module: route39
        },
  "routes/_index": {
          id: "routes/_index",
          parentId: "root",
          path: undefined,
          index: true,
          caseSensitive: undefined,
          module: route40
        },
  "routes/login": {
          id: "routes/login",
          parentId: "root",
          path: "login",
          index: undefined,
          caseSensitive: undefined,
          module: route41
        },
  "routes/git": {
          id: "routes/git",
          parentId: "root",
          path: "git",
          index: undefined,
          caseSensitive: undefined,
          module: route42
        }
      };

export { serverManifest as assets, assetsBuildDirectory, basename, entry, future, isSpaMode, mode, publicPath, routes };
