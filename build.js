#!/usr/bin/env node
/* ============================================================
 * build.js —— Netlify 构建脚本（自动运行，无需手动）
 *
 * 读取 content/posts/*.json 和 content/site.json（后台编辑的地方），
 * 生成博客实际使用的 posts.js 和 site.js。
 * ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, "content", "posts");
const SITE_FILE = path.join(ROOT, "content", "site.json");

function readJSON(file) {
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw);
}

/* ---------- 读取所有文章 ---------- */
let posts = [];
if (fs.existsSync(POSTS_DIR)) {
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  for (const f of files) {
    try {
      const p = readJSON(path.join(POSTS_DIR, f));
      posts.push({
        slug: p.slug || f.replace(/\.json$/, ""),
        title: String(p.title || "").trim(),
        date: String(p.date || "").trim(),
        tags: Array.isArray(p.tags) ? p.tags : [],
        body: String(p.body || ""),
      });
    } catch (e) {
      console.error("[build] 跳过无法解析的文件:", f, "-", e.message);
    }
  }
}
/* 按日期从新到旧 */
posts.sort((a, b) => (a.date < b.date ? 1 : -1));

/* ---------- 读取站点设置 ---------- */
let site = {};
if (fs.existsSync(SITE_FILE)) {
  site = readJSON(SITE_FILE);
}

/* ---------- 生成 posts.js ---------- */
const postsJS =
  "/* 由 build.js 自动生成 —— 请通过后台编辑，勿手改此文件 */\n" +
  "window.POSTS = " +
  JSON.stringify(posts, null, 2) +
  ";\n";
fs.writeFileSync(path.join(ROOT, "posts.js"), postsJS, "utf8");

/* ---------- 生成 site.js ---------- */
const siteJS =
  "/* 由 build.js 自动生成 —— 请通过后台编辑，勿手改此文件 */\n" +
  "window.SITE = " +
  JSON.stringify(site, null, 2) +
  ";\n";
fs.writeFileSync(path.join(ROOT, "site.js"), siteJS, "utf8");

console.log("[build] 完成：", posts.length, "篇文章,", Object.keys(site).length, "项站点设置");
