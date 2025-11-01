import { N as NO_TRANSLATE_ATTRIBUTE } from "./runtime.js";
import { R as setContext, a3 as getContext, W as attr, a0 as escape_html, a2 as stringify } from "./index.js";
import { w as writable } from "./index2.js";
const PARAGLIDE_CONTEXT_KEY = {};
const getParaglideContext = () => {
  return (
    /** @type { ParaglideContext<T> | undefined}*/
    getContext(PARAGLIDE_CONTEXT_KEY)
  );
};
const setParaglideContext = (context) => {
  setContext(PARAGLIDE_CONTEXT_KEY, context);
};
function getTranslationFunctions() {
  const ctx = getParaglideContext();
  function translateAttribute(value, lang_value) {
    if (typeof value !== "string") return value;
    if (!ctx) return value;
    return ctx.translateHref(value, lang_value);
  }
  function handleAttributes(attrs, attribute_translations) {
    if (attrs[NO_TRANSLATE_ATTRIBUTE]) return attrs;
    for (const { attribute_name, lang_attribute_name } of attribute_translations) {
      if (attribute_name in attrs) {
        const attr2 = attrs[attribute_name];
        const lang_attr = lang_attribute_name ? attrs[lang_attribute_name] : void 0;
        attrs[attribute_name] = translateAttribute(
          attr2,
          typeof lang_attr === "string" ? lang_attr : void 0
        );
      }
    }
    return attrs;
  }
  return [translateAttribute, handleAttributes];
}
function createAlertStore() {
  const { subscribe, update } = writable([]);
  let nextId = 1;
  return {
    subscribe,
    addAlert: (type, text, secs = 3) => {
      const id = nextId++;
      update((alerts2) => [...alerts2, { type, text, secs, id }]);
      setTimeout(() => {
        update((alerts2) => alerts2.filter((alert) => alert.id !== id));
      }, secs * 1e3);
    },
    removeAlert: (id) => {
      update((alerts2) => alerts2.filter((alert) => alert.id !== id));
    }
  };
}
const alerts = createAlertStore();
function Alert($$payload, $$props) {
  const icons = {
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    success: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    error: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
  };
  let { type = "info", text = "" } = $$props;
  $$payload.out += `<div role="alert"${attr("class", `alert alert-${stringify(type)} fixed mx-auto max-w-md svelte-8zz7h7`)}><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5"${attr("d", icons[type])}></path></svg> <span>${escape_html(text)}</span></div>`;
}
export {
  Alert as A,
  alerts as a,
  createAlertStore as c,
  getTranslationFunctions as g,
  setParaglideContext as s
};
