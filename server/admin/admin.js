/* GUN-जी admin dashboard — vanilla JS, talks to /api/admin/*. */
"use strict";

const TOKEN_KEY = "gunji_admin_token";
const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const CUSTOM_STATUSES = ["new", "discussing", "printing", "delivered", "declined"];
const METHODS = ["instagram", "whatsapp", "phone", "email"];
const EDITIONS = ["signature", "player", "anime", "desi", "custom"];

const $ = (sel, root = document) => root.querySelector(sel);

const state = {
  tab: "orders",
  orderFilter: "all",
  requestFilter: "all",
  stats: null,
  showOrderForm: false,
  editingProduct: null, // product id, or 0 for "new"
  editingCoupon: null, // coupon id, or 0 for "new"
};

/* ---------- tiny utils ---------- */

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fmtWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtPrice(p) {
  return `${p.priceFrom ? "from " : ""}Rs. ${Number(p.price).toLocaleString("en-IN")}`;
}

function fmtDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function contactHref(method, contact) {
  const c = String(contact || "").trim();
  if (/^https?:\/\//i.test(c)) return c;
  if (method === "whatsapp") {
    const digits = c.replace(/[^\d]/g, "");
    return digits ? `https://wa.me/${digits}` : "";
  }
  if (method === "instagram") {
    const handle = c.replace(/^@/, "").split(/[\s/]/)[0];
    return handle ? `https://www.instagram.com/${encodeURIComponent(handle)}/` : "";
  }
  if (method === "phone") return `tel:${c.replace(/[^\d+]/g, "")}`;
  if (method === "email") return `mailto:${c}`;
  return "";
}

let toastTimer;
function toast(msg, bad = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("bad", bad);
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2600);
}

/* ---------- api ---------- */

async function api(path, { method = "GET", body } = {}) {
  const headers = { Accept: "application/json" };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
    throw new Error("Session expired — log in again");
  }
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const detail = data.errors ? " (" + Object.entries(data.errors).map(([k, v]) => `${k}: ${v}`).join(", ") + ")" : "";
    throw new Error((data.error || `Request failed (${res.status})`) + detail);
  }
  return data;
}

/* ---------- login / logout ---------- */

function showLogin() {
  $("#app-view").classList.add("hidden");
  $("#login-view").classList.remove("hidden");
  $("#login-password").focus();
}

async function showApp() {
  $("#login-view").classList.add("hidden");
  $("#app-view").classList.remove("hidden");
  await refresh();
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = $("#login-error");
  errEl.classList.add("hidden");
  try {
    const { token } = await api("/admin/login", {
      method: "POST",
      body: { password: $("#login-password").value },
    });
    localStorage.setItem(TOKEN_KEY, token);
    $("#login-password").value = "";
    await showApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  }
});

$("#logout-btn").addEventListener("click", async () => {
  try { await api("/admin/logout", { method: "POST" }); } catch { /* already dead */ }
  localStorage.removeItem(TOKEN_KEY);
  showLogin();
});

/* ---------- stats + tabs ---------- */

async function refresh() {
  state.stats = await api("/admin/stats");
  renderStats();
  renderTabs();
  await renderPanel();
}

function renderStats() {
  const s = state.stats;
  const newOrders = s.orders.byStatus.pending || 0;
  const newReq = s.customRequests.byStatus.new || 0;
  $("#stats").innerHTML = `
    <div class="stat"><span class="stat-num ${newOrders ? "hot" : ""}">${newOrders}</span><span class="stat-label">pending orders</span></div>
    <div class="stat"><span class="stat-num ${newReq ? "hot" : ""}">${newReq}</span><span class="stat-label">new custom requests</span></div>
    <div class="stat"><span class="stat-num">${s.orders.total}</span><span class="stat-label">orders total</span></div>
    <div class="stat"><span class="stat-num">${s.products.active}</span><span class="stat-label">tees live on site</span></div>
  `;
  const bo = $("#badge-orders");
  bo.textContent = newOrders;
  bo.classList.toggle("hidden", !newOrders);
  const br = $("#badge-requests");
  br.textContent = newReq;
  br.classList.toggle("hidden", !newReq);
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach((b) => {
    b.classList.toggle("on", b.dataset.tab === state.tab);
  });
}

$("#tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  state.tab = btn.dataset.tab;
  renderTabs();
  renderPanel();
});

async function renderPanel() {
  const panel = $("#panel");
  panel.innerHTML = `<p class="empty-note">Loading…</p>`;
  try {
    if (state.tab === "orders") await renderOrders(panel);
    else if (state.tab === "requests") await renderRequests(panel);
    else if (state.tab === "products") await renderProducts(panel);
    else if (state.tab === "coupons") await renderCoupons(panel);
    else await renderSettings(panel);
  } catch (err) {
    panel.innerHTML = `<p class="empty-note">${esc(err.message)}</p>`;
  }
}

/* ---------- shared bits ---------- */

function statusSelect(kind, id, current, statuses) {
  const opts = statuses
    .map((s) => `<option value="${s}" ${s === current ? "selected" : ""}>${s}</option>`)
    .join("");
  const cls = current === "new" || current === "pending" ? "s-new" : ["delivered", "cancelled", "declined"].includes(current) ? "s-done" : "";
  return `<select class="status-select ${cls}" data-kind="${kind}" data-id="${id}">${opts}</select>`;
}

function filterChips(kind, current, statuses) {
  return `<div class="chips">${["all", ...statuses]
    .map((s) => `<button class="chip ${s === current ? "on" : ""}" data-filter-kind="${kind}" data-filter="${s}">${s}</button>`)
    .join("")}</div>`;
}

function contactCell(row) {
  const href = contactHref(row.method, row.contact);
  const label = `${esc(row.contact)}`;
  const link = href
    ? `<a class="contact-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`
    : label;
  return `${esc(row.name)}<span class="sub">${esc(row.method)} · ${link}</span>`;
}

/* ---------- orders tab ---------- */

async function renderOrders(panel) {
  const q = state.orderFilter === "all" ? "" : `?status=${state.orderFilter}`;
  const { items } = await api(`/admin/orders${q}`);

  const rows = items.map((o) => `
    <tr>
      <td class="cell-id">#${o.id}${o.source === "manual" ? "<span class='sub'>manual</span>" : ""}</td>
      <td class="cell-when">${fmtWhen(o.createdAt)}</td>
      <td>${esc(o.item)}<span class="sub">${o.qty} pc${o.qty > 1 ? "s" : ""}${o.size ? ` · ${esc(o.size)}` : ""}${o.colour ? ` · ${esc(o.colour)}` : ""}</span>
        ${o.total ? `<span class="order-total">Rs. ${Number(o.total).toLocaleString("en-IN")}${o.qty > 1 ? ` <span class="sub-inline">(${o.qty} × ${Number(o.unitPrice).toLocaleString("en-IN")})</span>` : ""}</span>` : ""}
        ${o.discount ? `<span class="sub coupon-order-note">${esc(o.couponCode)} · −Rs. ${Number(o.discount).toLocaleString("en-IN")}</span>` : ""}
        ${o.note ? `<span class="note-line">“${esc(o.note)}”</span>` : ""}</td>
      <td>${contactCell(o)}${o.locationUrl ? `<span class="sub"><a class="contact-link" href="${esc(o.locationUrl)}" target="_blank" rel="noopener noreferrer">📍 delivery pin${o.location && o.location.accuracy ? ` (±${o.location.accuracy}m)` : ""} ↗</a></span>` : ""}${o.customerEmail ? `<span class="acct-badge" title="Placed while logged in">◆ ${esc(o.customerEmail)}</span>` : ""}</td>
      <td>${statusSelect("order", o.id, o.status, ORDER_STATUSES)}
        ${o.adminNote ? `<span class="note-line">✎ ${esc(o.adminNote)}</span>` : ""}</td>
      <td><div class="row-actions">
        <button class="icon-btn" data-note-kind="order" data-id="${o.id}" title="Edit note">✎ note</button>
        <button class="icon-btn danger" data-del-kind="order" data-id="${o.id}" title="Delete">✕</button>
      </div></td>
    </tr>`).join("");

  panel.innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">Order book</h2>
      ${filterChips("order", state.orderFilter, ORDER_STATUSES)}
      <button class="btn btn-solid btn-sm" id="add-order-btn">+ Log a DM order</button>
    </div>
    <form id="order-form" class="form-card ${state.showOrderForm ? "" : "hidden"}">
      <label class="field field-wide"><span class="field-label">Item *</span><input name="item" type="text" required maxlength="160" placeholder="GUN-जी Logo Tee (white)"></label>
      <label class="field"><span class="field-label">Customer *</span><input name="name" type="text" required maxlength="80"></label>
      <label class="field"><span class="field-label">Contact *</span><input name="contact" type="text" required maxlength="120" placeholder="@handle or 98…"></label>
      <label class="field"><span class="field-label">Via</span><select name="method">${METHODS.map((m) => `<option>${m}</option>`).join("")}</select></label>
      <label class="field"><span class="field-label">Size</span><input name="size" type="text" maxlength="20" placeholder="XL"></label>
      <label class="field"><span class="field-label">Qty</span><input name="qty" type="number" min="1" max="99" value="1"></label>
      <label class="field"><span class="field-label">Colour</span><input name="colour" type="text" maxlength="40" placeholder="black"></label>
      <label class="field"><span class="field-label">Unit price (Rs.)</span><input name="unitPrice" type="number" min="0" max="1000000" placeholder="0"></label>
      <label class="field field-wide"><span class="field-label">Note</span><input name="note" type="text" maxlength="1000"></label>
      <div class="form-foot">
        <button type="submit" class="btn btn-solid btn-sm">Save order</button>
        <button type="button" class="btn btn-sm" id="cancel-order-btn">Cancel</button>
      </div>
    </form>
    ${items.length
      ? `<div class="table-wrap"><table>
          <thead><tr><th>#</th><th>When</th><th>Item</th><th>Customer</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody></table></div>`
      : `<p class="empty-note">No ${state.orderFilter === "all" ? "" : state.orderFilter + " "}orders yet — they'll land here from the site, or log DM orders yourself.</p>`}
  `;

  $("#add-order-btn").addEventListener("click", () => {
    state.showOrderForm = !state.showOrderForm;
    $("#order-form").classList.toggle("hidden", !state.showOrderForm);
  });
  $("#cancel-order-btn").addEventListener("click", () => {
    state.showOrderForm = false;
    $("#order-form").classList.add("hidden");
  });
  $("#order-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api("/admin/orders", { method: "POST", body: Object.fromEntries(fd.entries()) });
      state.showOrderForm = false;
      toast("Order logged");
      await refresh();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

/* ---------- custom requests tab ---------- */

async function renderRequests(panel) {
  const q = state.requestFilter === "all" ? "" : `?status=${state.requestFilter}`;
  const { items } = await api(`/admin/custom-requests${q}`);

  const rows = items.map((r) => `
    <tr>
      <td class="cell-id">#${r.id}</td>
      <td class="cell-when">${fmtWhen(r.createdAt)}</td>
      <td class="idea-cell">
        <div class="idea-text clamped">${esc(r.idea)}</div>
        <button class="idea-more">more</button>
        <span class="sub">${r.qty} pc${r.qty > 1 ? "s" : ""}${r.size ? ` · ${esc(r.size)}` : ""}${r.colour ? ` · ${esc(r.colour)}` : ""}</span>
        ${r.referenceUrl ? `<span class="sub"><a class="contact-link" href="${esc(r.referenceUrl)}" target="_blank" rel="noopener noreferrer">reference ↗</a></span>` : ""}
      </td>
      <td>${contactCell(r)}</td>
      <td>${statusSelect("request", r.id, r.status, CUSTOM_STATUSES)}
        ${r.adminNote ? `<span class="note-line">✎ ${esc(r.adminNote)}</span>` : ""}</td>
      <td><div class="row-actions">
        <button class="icon-btn" data-note-kind="request" data-id="${r.id}" title="Edit note">✎ note</button>
        <button class="icon-btn danger" data-del-kind="request" data-id="${r.id}" title="Delete">✕</button>
      </div></td>
    </tr>`).join("");

  panel.innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">Custom print requests</h2>
      ${filterChips("request", state.requestFilter, CUSTOM_STATUSES)}
    </div>
    ${items.length
      ? `<div class="table-wrap"><table>
          <thead><tr><th>#</th><th>When</th><th>Idea</th><th>Customer</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody></table></div>`
      : `<p class="empty-note">No requests${state.requestFilter === "all" ? "" : ` in “${state.requestFilter}”`} yet — the custom-print form on the site posts here.</p>`}
  `;
}

/* ---------- products tab ---------- */

function productForm(p = {}) {
  const isNew = !p.id;
  return `
  <form class="form-card" id="product-form" data-id="${p.id || ""}">
    <label class="field field-wide"><span class="field-label">Name *</span><input name="name" type="text" required maxlength="120" value="${esc(p.name)}"></label>
    <label class="field field-wide"><span class="field-label">Tag line</span><input name="tag" type="text" maxlength="160" value="${esc(p.tag)}" placeholder="Player Edition — white"></label>
    <label class="field"><span class="field-label">Price (Rs.) *</span><input name="price" type="number" required min="0" max="1000000" value="${p.price ?? ""}"></label>
    <label class="field"><span class="field-label">Compare-at / “was” (Rs.)</span><input name="compareAt" type="number" min="0" max="1000000" value="${p.compareAt ?? ""}" placeholder="blank = no sale"></label>
    <label class="check-field"><input name="priceFrom" type="checkbox" ${p.priceFrom ? "checked" : ""}> <span class="field-label">“from” price</span></label>
    <label class="field"><span class="field-label">Edition</span><select name="edition">${EDITIONS.map((ed) => `<option ${ed === (p.edition || "signature") ? "selected" : ""}>${ed}</option>`).join("")}</select></label>
    <label class="field"><span class="field-label">Sort order</span><input name="sortOrder" type="number" min="0" max="1000000" value="${p.sortOrder ?? ""}" placeholder="auto"></label>
    <label class="field field-wide"><span class="field-label">Image path *</span><input name="img" type="text" required maxlength="300" value="${esc(p.img)}" placeholder="/assets/gunji_tee_white_front.jpg"></label>
    <label class="field field-wide"><span class="field-label">Alt text</span><input name="alt" type="text" maxlength="300" value="${esc(p.alt)}"></label>
    <label class="field field-wide"><span class="field-label">Order line (prefills the DM)</span><input name="orderItem" type="text" maxlength="160" value="${esc(p.orderItem)}" placeholder="defaults to the name"></label>
    <div class="form-foot">
      <button type="submit" class="btn btn-solid btn-sm">${isNew ? "Add tee" : "Save changes"}</button>
      <button type="button" class="btn btn-sm" id="cancel-product-btn">Cancel</button>
    </div>
  </form>`;
}

async function renderProducts(panel) {
  const { items } = await api("/admin/products");

  const rows = items.map((p) => `
    <div class="product-row ${p.active ? "" : "inactive"}">
      <img class="product-thumb" src="${esc(p.img)}" alt="" loading="lazy" data-thumb>
      <div class="product-main">
        <div class="product-name dev">${esc(p.name)}</div>
        <div class="product-tag dev">${esc(p.tag)}</div>
      </div>
      <span class="product-price">${esc(fmtPrice(p))}${p.compareAt ? ` <span class="product-was">was ${Number(p.compareAt).toLocaleString("en-IN")}</span>` : ""}</span>
      <span class="product-ed">${esc(p.edition)}</span>
      <div class="row-actions">
        <button class="icon-btn" data-toggle-active="${p.id}" data-active="${p.active ? 1 : 0}">${p.active ? "Hide" : "Show"}</button>
        <button class="icon-btn" data-edit-product="${p.id}">Edit</button>
        <button class="icon-btn danger" data-del-kind="product" data-id="${p.id}">✕</button>
      </div>
    </div>`).join("");

  panel.innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">Tees on the rack</h2>
      <button class="btn btn-solid btn-sm" id="add-product-btn">+ New tee</button>
    </div>
    <div id="product-form-slot">${state.editingProduct === 0 ? productForm() : ""}</div>
    <div class="product-rows">${rows || `<p class="empty-note">No products yet.</p>`}</div>
  `;

  // Broken thumbs (e.g. dist not built yet) collapse quietly.
  panel.querySelectorAll("[data-thumb]").forEach((img) => {
    img.addEventListener("error", () => { img.style.visibility = "hidden"; }, { once: true });
  });

  $("#add-product-btn").addEventListener("click", () => {
    state.editingProduct = 0;
    renderPanel();
  });

  panel.querySelectorAll("[data-edit-product]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.editingProduct = Number(btn.dataset.editProduct);
      const p = items.find((x) => x.id === state.editingProduct);
      $("#product-form-slot").innerHTML = productForm(p);
      bindProductForm();
      $("#product-form-slot").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  panel.querySelectorAll("[data-toggle-active]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/admin/products/${btn.dataset.toggleActive}`, {
          method: "PATCH",
          body: { active: btn.dataset.active !== "1" },
        });
        toast("Saved");
        await refresh();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });

  if (state.editingProduct === 0) bindProductForm();
}

function bindProductForm() {
  const form = $("#product-form");
  if (!form) return;
  $("#cancel-product-btn").addEventListener("click", () => {
    state.editingProduct = null;
    renderPanel();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());
    body.priceFrom = fd.has("priceFrom");
    if (!body.sortOrder) delete body.sortOrder;
    const id = form.dataset.id;
    try {
      await api(id ? `/admin/products/${id}` : "/admin/products", {
        method: id ? "PATCH" : "POST",
        body,
      });
      state.editingProduct = null;
      toast(id ? "Tee updated" : "Tee added");
      await refresh();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

/* ---------- coupons tab ---------- */

function couponStatus(coupon) {
  const now = Date.now();
  if (!coupon.active) return "inactive";
  if (coupon.validFrom && new Date(coupon.validFrom).getTime() > now) return "scheduled";
  if (coupon.validUntil && new Date(coupon.validUntil).getTime() <= now) return "expired";
  if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) return "used up";
  return "live";
}

async function renderCoupons(panel) {
  const { items } = await api("/admin/coupons");
  const editing = state.editingCoupon === null
    ? null
    : state.editingCoupon === 0
      ? {
          id: null, code: "", description: "", discountType: "percent",
          discountValue: 10, minOrderAmount: 0, maxUses: null, maxDiscountItems: null,
          validFrom: null, validUntil: null, active: true,
        }
      : items.find((coupon) => coupon.id === state.editingCoupon);

  const form = editing ? `
    <form id="coupon-form" class="form-card coupon-form" data-id="${editing.id || ""}">
      <label class="field"><span class="field-label">Code *</span><input name="code" type="text" required maxlength="32" value="${esc(editing.code)}" placeholder="GUNJI10"></label>
      <label class="field field-wide"><span class="field-label">Description</span><input name="description" type="text" maxlength="240" value="${esc(editing.description)}" placeholder="Launch offer"></label>
      <label class="field"><span class="field-label">Discount type *</span>
        <select name="discountType"><option value="percent" ${editing.discountType === "percent" ? "selected" : ""}>Percentage</option><option value="fixed" ${editing.discountType === "fixed" ? "selected" : ""}>Fixed rupees</option></select>
      </label>
      <label class="field"><span class="field-label">Discount value *</span><input name="discountValue" type="number" required min="1" max="1000000" value="${editing.discountValue}"></label>
      <label class="field"><span class="field-label">Minimum order (Rs.)</span><input name="minOrderAmount" type="number" min="0" max="10000000" value="${editing.minOrderAmount}"></label>
      <label class="field"><span class="field-label">Maximum uses</span><input name="maxUses" type="number" min="1" max="1000000" value="${editing.maxUses ?? ""}" placeholder="Unlimited"></label>
      <label class="field"><span class="field-label">T-shirts discounted per order</span><input name="maxDiscountItems" type="number" min="1" max="1000000" value="${editing.maxDiscountItems ?? ""}" placeholder="Unlimited"></label>
      <label class="field"><span class="field-label">Starts</span><input name="validFrom" type="datetime-local" value="${fmtDateInput(editing.validFrom)}"></label>
      <label class="field"><span class="field-label">Ends</span><input name="validUntil" type="datetime-local" value="${fmtDateInput(editing.validUntil)}"></label>
      <label class="check-field"><input name="active" type="checkbox" ${editing.active ? "checked" : ""}> Active</label>
      <div class="form-foot">
        <button type="submit" class="btn btn-solid btn-sm">${editing.id ? "Save coupon" : "Create coupon"}</button>
        <button type="button" class="btn btn-sm" id="cancel-coupon-btn">Cancel</button>
      </div>
    </form>` : "";

  const rows = items.map((coupon) => {
    const status = couponStatus(coupon);
    const value = coupon.discountType === "percent"
      ? `${coupon.discountValue}%`
      : `Rs. ${Number(coupon.discountValue).toLocaleString("en-IN")}`;
    const windowText = coupon.validUntil
      ? `Ends ${fmtWhen(coupon.validUntil)}`
      : coupon.validFrom ? `Starts ${fmtWhen(coupon.validFrom)}` : "No expiry";
    return `
      <tr>
        <td><strong class="coupon-code">${esc(coupon.code)}</strong><span class="sub">${esc(coupon.description)}</span></td>
        <td>${value}<span class="sub">Min. Rs. ${Number(coupon.minOrderAmount).toLocaleString("en-IN")} · ${coupon.maxDiscountItems === null ? "all tees" : `${coupon.maxDiscountItems} tee${coupon.maxDiscountItems === 1 ? "" : "s"} per order`}</span></td>
        <td>${coupon.usesCount}${coupon.maxUses === null ? "" : ` / ${coupon.maxUses}`}<span class="sub">${windowText}</span></td>
        <td><span class="coupon-state coupon-state-${status.replace(" ", "-")}">${status}</span></td>
        <td><div class="row-actions">
          <button class="icon-btn" data-edit-coupon="${coupon.id}">✎ edit</button>
          <button class="icon-btn" data-toggle-coupon="${coupon.id}" data-active="${coupon.active ? "1" : "0"}">${coupon.active ? "Pause" : "Activate"}</button>
          <button class="icon-btn danger" data-delete-coupon="${coupon.id}">✕</button>
        </div></td>
      </tr>`;
  }).join("");

  panel.innerHTML = `
    <div class="panel-head">
      <div><h2 class="panel-title">Coupon codes</h2><p class="hint">Discounts are checked against live prices again when the order is placed.</p></div>
      <button class="btn btn-solid btn-sm" id="add-coupon-btn">+ New coupon</button>
    </div>
    ${form}
    ${items.length
      ? `<div class="table-wrap"><table><thead><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
      : `<p class="empty-note">No coupon codes yet — create the first one.</p>`}
  `;

  $("#add-coupon-btn").addEventListener("click", () => {
    state.editingCoupon = 0;
    renderPanel();
  });
  panel.querySelectorAll("[data-edit-coupon]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingCoupon = Number(button.dataset.editCoupon);
      renderPanel();
    });
  });
  panel.querySelectorAll("[data-toggle-coupon]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api(`/admin/coupons/${button.dataset.toggleCoupon}`, {
          method: "PATCH",
          body: { active: button.dataset.active !== "1" },
        });
        toast(button.dataset.active === "1" ? "Coupon paused" : "Coupon activated");
        await renderPanel();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });
  panel.querySelectorAll("[data-delete-coupon]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this coupon? Past orders keep their coupon snapshot.")) return;
      try {
        await api(`/admin/coupons/${button.dataset.deleteCoupon}`, { method: "DELETE" });
        toast("Coupon deleted");
        await renderPanel();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });

  if (!editing) return;
  $("#cancel-coupon-btn").addEventListener("click", () => {
    state.editingCoupon = null;
    renderPanel();
  });
  $("#coupon-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(event.target);
    const body = Object.fromEntries(fd.entries());
    body.active = fd.has("active");
    body.validFrom = body.validFrom ? new Date(body.validFrom).toISOString() : "";
    body.validUntil = body.validUntil ? new Date(body.validUntil).toISOString() : "";
    const id = event.target.dataset.id;
    try {
      await api(id ? `/admin/coupons/${id}` : "/admin/coupons", {
        method: id ? "PATCH" : "POST",
        body,
      });
      state.editingCoupon = null;
      toast(id ? "Coupon updated" : "Coupon created");
      await renderPanel();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

/* ---------- settings tab ---------- */

async function renderSettings(panel) {
  const s = await api("/settings");
  panel.innerHTML = `
    <div class="panel-head"><h2 class="panel-title">Site settings</h2></div>
    <form class="settings-form" id="settings-form">
      <label class="field">
        <span class="field-label">WhatsApp number (with country code, digits only)</span>
        <input name="whatsappNumber" type="text" maxlength="20" value="${esc(s.whatsappNumber)}" placeholder="9779812345678">
      </label>
      <p class="hint" id="wa-hint"></p>
      <label class="field">
        <span class="field-label">Instagram DM link</span>
        <input name="igDm" type="url" maxlength="300" value="${esc(s.igDm)}">
      </label>
      <label class="field">
        <span class="field-label">Instagram profile link</span>
        <input name="igProfile" type="url" maxlength="300" value="${esc(s.igProfile)}">
      </label>
      <section class="gallery-settings">
        <div class="gallery-settings-head">
          <div>
            <h3>Homepage gallery</h3>
            <p class="hint">Use an existing <code>/assets/…</code> path or a public <code>https://</code> image URL. Drag order is controlled with the arrows.</p>
          </div>
          <button type="button" class="btn btn-sm" id="add-gallery-photo">+ Add photo</button>
        </div>
        <div id="gallery-settings-list"></div>
      </section>
      <label class="field">
        <span class="field-label">Crop T-Shirt “coming soon” image</span>
        <input name="comingSoonImage" type="text" maxlength="1000" value="${esc(s.comingSoonImage)}" placeholder="/assets/gunji_coming_soon.jpg">
      </label>
      <label class="field upload-field">
        <span class="field-label">Or upload a new crop-shirt photo</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" id="coming-soon-file">
      </label>
      <img class="settings-image-preview" id="coming-soon-preview" src="${esc(s.comingSoonImage)}" alt="Coming-soon image preview">
      <div class="form-foot"><button type="submit" class="btn btn-solid btn-sm">Save settings</button></div>
    </form>
  `;

  const galleryList = $("#gallery-settings-list");
  let galleryItems = Array.isArray(s.homeGallery) ? s.homeGallery.map((item) => ({ ...item })) : [];

  const readGalleryRows = () =>
    [...galleryList.querySelectorAll(".gallery-setting-row")].map((row) => ({
      src: row.querySelector("[data-gallery-src]").value.trim(),
      cap: row.querySelector("[data-gallery-cap]").value.trim(),
      alt: row.querySelector("[data-gallery-alt]").value.trim(),
    }));

  const paintGalleryRows = () => {
    galleryList.innerHTML = galleryItems.map((item, index) => `
      <div class="gallery-setting-row">
        <img class="gallery-setting-preview" src="${esc(item.src)}" alt="" data-gallery-preview>
        <div class="gallery-setting-fields">
          <label class="field field-wide">
            <span class="field-label">Photo ${index + 1} path / URL</span>
            <input type="text" maxlength="1000" value="${esc(item.src)}" data-gallery-src required>
          </label>
          <label class="field">
            <span class="field-label">Caption</span>
            <input type="text" maxlength="120" value="${esc(item.cap)}" data-gallery-cap>
          </label>
          <label class="field">
            <span class="field-label">Alt text</span>
            <input type="text" maxlength="300" value="${esc(item.alt)}" data-gallery-alt>
          </label>
          <label class="field field-wide upload-field">
            <span class="field-label">Upload a replacement photo</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-gallery-file>
          </label>
        </div>
        <div class="gallery-setting-actions">
          <button type="button" class="icon-btn" data-gallery-move="-1" data-index="${index}" ${index === 0 ? "disabled" : ""} aria-label="Move photo up">↑</button>
          <button type="button" class="icon-btn" data-gallery-move="1" data-index="${index}" ${index === galleryItems.length - 1 ? "disabled" : ""} aria-label="Move photo down">↓</button>
          <button type="button" class="icon-btn danger" data-gallery-remove="${index}" aria-label="Remove photo">✕</button>
        </div>
      </div>
    `).join("");

    galleryList.querySelectorAll("[data-gallery-src]").forEach((input) => {
      input.addEventListener("input", () => {
        input.closest(".gallery-setting-row").querySelector("[data-gallery-preview]").src = input.value;
      });
    });
    galleryList.querySelectorAll("[data-gallery-file]").forEach((input) => {
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          input.disabled = true;
          const url = await uploadImage(file);
          const row = input.closest(".gallery-setting-row");
          row.querySelector("[data-gallery-src]").value = url;
          row.querySelector("[data-gallery-preview]").src = url;
          toast("Photo uploaded — save settings to publish it");
        } catch (err) {
          toast(err.message, true);
        } finally {
          input.disabled = false;
        }
      });
    });
    galleryList.querySelectorAll("[data-gallery-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        galleryItems = readGalleryRows();
        if (galleryItems.length === 1) return toast("Keep at least one gallery photo", true);
        galleryItems.splice(Number(button.dataset.galleryRemove), 1);
        paintGalleryRows();
      });
    });
    galleryList.querySelectorAll("[data-gallery-move]").forEach((button) => {
      button.addEventListener("click", () => {
        galleryItems = readGalleryRows();
        const from = Number(button.dataset.index);
        const to = from + Number(button.dataset.galleryMove);
        [galleryItems[from], galleryItems[to]] = [galleryItems[to], galleryItems[from]];
        paintGalleryRows();
      });
    });
  };

  paintGalleryRows();
  $("#add-gallery-photo").addEventListener("click", () => {
    galleryItems = readGalleryRows();
    if (galleryItems.length >= 12) return toast("The gallery supports up to 12 photos", true);
    galleryItems.push({ src: "", cap: "", alt: "" });
    paintGalleryRows();
    galleryList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  const comingSoonInput = $("#settings-form [name=comingSoonImage]");
  comingSoonInput.addEventListener("input", () => {
    $("#coming-soon-preview").src = comingSoonInput.value;
  });
  $("#coming-soon-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      e.target.disabled = true;
      const url = await uploadImage(file);
      comingSoonInput.value = url;
      $("#coming-soon-preview").src = url;
      toast("Photo uploaded — save settings to publish it");
    } catch (err) {
      toast(err.message, true);
    } finally {
      e.target.disabled = false;
    }
  });

  const waInput = $("#settings-form [name=whatsappNumber]");
  const hint = $("#wa-hint");
  const updateHint = () => {
    const digits = waInput.value.replace(/[^\d]/g, "");
    hint.innerHTML = digits
      ? `Order buttons will open <code>wa.me/${esc(digits)}</code>`
      : `Empty — order buttons fall back to the Instagram DM link.`;
  };
  updateHint();
  waInput.addEventListener("input", updateHint);

  $("#settings-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      whatsappNumber: fd.get("whatsappNumber"),
      igDm: fd.get("igDm"),
      igProfile: fd.get("igProfile"),
      comingSoonImage: fd.get("comingSoonImage"),
      homeGallery: readGalleryRows(),
    };
    try {
      await api("/admin/settings", { method: "PUT", body });
      toast("Settings saved — live on the site now");
    } catch (err) {
      toast(err.message, true);
    }
  });
}

async function uploadImage(file) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    throw new Error("Use a JPG, PNG, WebP or GIF image");
  }
  if (file.size > 6 * 1024 * 1024) {
    throw new Error("Image must be smaller than 6 MB");
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read that image"));
    reader.readAsDataURL(file);
  });
  const result = await api("/admin/media", { method: "POST", body: { dataUrl } });
  return result.url;
}

/* ---------- delegated row actions (status, note, delete, idea expand) ---------- */

const KIND_PATHS = { order: "/admin/orders", request: "/admin/custom-requests", product: "/admin/products" };

document.addEventListener("change", async (e) => {
  const sel = e.target.closest(".status-select");
  if (!sel) return;
  try {
    await api(`${KIND_PATHS[sel.dataset.kind]}/${sel.dataset.id}`, {
      method: "PATCH",
      body: { status: sel.value },
    });
    toast(`Marked ${sel.value}`);
    await refresh();
  } catch (err) {
    toast(err.message, true);
    await renderPanel();
  }
});

document.addEventListener("click", async (e) => {
  const noteBtn = e.target.closest("[data-note-kind]");
  if (noteBtn) {
    const current = noteBtn.closest("td")?.querySelector(".note-line")?.textContent.replace(/^✎ /, "") || "";
    const next = prompt("Private note (only you see this):", current);
    if (next === null) return;
    try {
      await api(`${KIND_PATHS[noteBtn.dataset.noteKind]}/${noteBtn.dataset.id}`, {
        method: "PATCH",
        body: { adminNote: next.trim() },
      });
      toast("Note saved");
      await renderPanel();
    } catch (err) {
      toast(err.message, true);
    }
    return;
  }

  const delBtn = e.target.closest("[data-del-kind]");
  if (delBtn) {
    const kind = delBtn.dataset.delKind;
    const label = kind === "product" ? "Delete this tee permanently? (Use Hide to just take it off the site.)" : "Delete this entry permanently?";
    if (!confirm(label)) return;
    try {
      const hard = kind === "product" ? "?hard=1" : "";
      await api(`${KIND_PATHS[kind]}/${delBtn.dataset.id}${hard}`, { method: "DELETE" });
      toast("Deleted");
      await refresh();
    } catch (err) {
      toast(err.message, true);
    }
    return;
  }

  const moreBtn = e.target.closest(".idea-more");
  if (moreBtn) {
    const text = moreBtn.parentElement.querySelector(".idea-text");
    const clamped = text.classList.toggle("clamped");
    moreBtn.textContent = clamped ? "more" : "less";
    return;
  }

  const chip = e.target.closest("[data-filter-kind]");
  if (chip) {
    if (chip.dataset.filterKind === "order") state.orderFilter = chip.dataset.filter;
    else state.requestFilter = chip.dataset.filter;
    renderPanel();
  }
});

/* ---------- boot ---------- */

(async function boot() {
  if (!localStorage.getItem(TOKEN_KEY)) return showLogin();
  try {
    await api("/admin/me");
    await showApp();
  } catch {
    // api() already routed us to the login view on 401
  }
})();
