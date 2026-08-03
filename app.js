/* ============================================================
 * app.js —— 渲染与路由（一般不需要改动）
 * ============================================================ */
(function () {
  "use strict";

  /* ---------- 工具 ---------- */
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* 行内 Markdown：先转义 HTML，再处理 `code` → 图片 → 链接 → 加粗 → 斜体 */
  function inline(s) {
    s = esc(s);
    var stash = [];
    s = s.replace(/`([^`]+)`/g, function (_, c) {
      stash.push("<code>" + c + "</code>");
      return "\u0000" + (stash.length - 1) + "\u0000";
    });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2" loading="lazy">');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return stash[+i]; });
    return s;
  }

  /* 简易 Markdown 块级解析：段落 / 标题 / 引用 / 列表 / 代码 / 分隔线 */
  function md(src) {
    var lines = src.split("\n");
    var out = [], i = 0, buf, para;

    function flushPara() {
      if (para.length) { out.push("<p>" + inline(para.join("")) + "</p>"); para = []; }
    }
    para = [];

    while (i < lines.length) {
      var line = lines[i];

      if (/^\s*$/.test(line)) { flushPara(); i++; continue; }

      if (/^```/.test(line)) {           /* 代码块 */
        flushPara(); buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++; /* 跳过结尾 ``` */
        out.push("<pre><code>" + esc(buf.join("\n")) + "</code></pre>");
        continue;
      }

      var h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) { flushPara(); var lv = h[1].length === 1 ? 2 : h[1].length;
        out.push("<h" + lv + ">" + inline(h[2]) + "</h" + lv + ">"); i++; continue; }

      if (/^(---|\*\*\*)\s*$/.test(line)) { flushPara(); out.push("<hr>"); i++; continue; }

      if (/^>\s?/.test(line)) {           /* 引用块 */
        flushPara(); buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          buf.push(lines[i].replace(/^>\s?/, "")); i++;
        }
        out.push("<blockquote>" + md(buf.join("\n")) + "</blockquote>");
        continue;
      }

      if (/^[-*]\s+/.test(line)) {        /* 无序列表 */
        flushPara(); buf = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
          buf.push("<li>" + inline(lines[i].replace(/^[-*]\s+/, "")) + "</li>"); i++;
        }
        out.push("<ul>" + buf.join("") + "</ul>");
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {       /* 有序列表 */
        flushPara(); buf = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          buf.push("<li>" + inline(lines[i].replace(/^\d+\.\s+/, "")) + "</li>"); i++;
        }
        out.push("<ol>" + buf.join("") + "</ol>");
        continue;
      }

      para.push(line); i++;               /* 普通段落（连续的换行合并为一段） */
    }
    flushPara();
    return out.join("\n");
  }

  /* ---------- 数据 ---------- */
  var posts = (window.POSTS || []).slice().sort(function (a, b) {
    return a.date < b.date ? 1 : -1;
  });

  /* ---------- 视图 ---------- */
  var view = document.getElementById("view");

  function renderHome() {
    document.title = window.SITE.title + " · " + window.SITE.tagline;
    nav("");

    var rows = posts.map(function (p, idx) {
      var no = "№ " + String(idx + 1).padStart(2, "0");
      return '<li class="post-item fade-in d' + Math.min(idx, 3) + '">' +
        '<a href="#/post/' + p.slug + '">' +
        '<span class="no">' + no + "</span>" +
        '<span class="pd">' + p.date.replace(/-/g, ".") + "</span>" +
        '<span class="pt">' + esc(p.title) + "</span>" +
        "</a></li>";
    }).join("");

    view.innerHTML =
      '<ul class="post-list">' + rows + "</ul>" +
      '<p class="list-note fade-in d3">— 共 <b>' + posts.length +
      '</b> 篇 · 慢慢读 —</p>';
  }

  function renderPost(slug) {
    var idx = posts.findIndex(function (p) { return p.slug === slug; });
    if (idx === -1) return renderNotFound();
    var p = posts[idx];

    document.title = p.title + " · " + window.SITE.title;
    nav("post");

    var tags = (p.tags || []).map(function (t) {
      return '<span class="tag">#' + esc(t) + "</span>";
    }).join("");

    var prev = posts[idx + 1], next = posts[idx - 1];
    var navHtml = '<div class="post-nav">';
    navHtml += prev
      ? '<a href="#/post/' + prev.slug + '">← ' + esc(prev.title) + "</a>"
      : "<span></span>";
    navHtml += next
      ? '<a href="#/post/' + next.slug + '">' + esc(next.title) + " →</a>"
      : "<span></span>";
    navHtml += "</div>";

    view.innerHTML =
      '<a class="back fade-in" href="#/">← 返回目录</a>' +
      '<article>' +
      '<header class="post-head fade-in d1">' +
      '<p class="kicker">' + window.SITE.issue + " · " + esc(p.slug) + "</p>" +
      "<h1>" + esc(p.title) + "</h1>" +
      '<div class="post-meta"><span>' + p.date.replace(/-/g, ".") + "</span>" + tags + "</div>" +
      "</header>" +
      '<div class="post-body fade-in d2">' + md(p.body) + "</div>" +
      navHtml +
      "</article>";
  }

  function renderAbout() {
    document.title = "关于 · " + window.SITE.title;
    nav("about");
    view.innerHTML =
      '<a class="back fade-in" href="#/">← 返回目录</a>' +
      '<section class="about fade-in d1">' +
      "<h1>关于</h1>" + md(window.SITE.about) +
      "</section>";
  }

  function renderNotFound() {
    document.title = "没找到 · " + window.SITE.title;
    nav("");
    view.innerHTML =
      '<section class="about fade-in">' +
      "<h1>这一页不在</h1>" +
      '<p class="bio">也许它被风吹走了。<a class="back" href="#/">← 回到目录</a></p>' +
      "</section>";
  }

  /* 导航高亮 */
  function nav(active) {
    document.querySelectorAll(".masthead-nav a").forEach(function (a) {
      var key = a.dataset.key || "";
      a.classList.toggle("on", key === active || (active === "post" && key === ""));
    });
  }

  /* ---------- 路由 ---------- */
  function route() {
    var h = location.hash || "#/";
    var m;
    if ((m = h.match(/^#\/post\/([\w-]+)/))) renderPost(m[1]);
    else if (h === "#/about") renderAbout();
    else if (h === "#/" || h === "#" || h === "") renderHome();
    else renderNotFound();
    window.scrollTo(0, 0);
  }

  /* ---------- 初始化 ---------- */
  function init() {
    document.getElementById("siteTitle").textContent = window.SITE.title;
    document.getElementById("siteTagline").textContent = window.SITE.tagline;
    document.getElementById("siteNav").innerHTML =
      '<a href="#/" data-key="">文章</a>' +
      '<a href="#/about" data-key="about">关于</a>';
    var mast = document.getElementById("masthead");
    var issue = document.createElement("span");
    issue.className = "issue";
    issue.innerHTML = "<b>" + window.SITE.issue + "</b><br>A QUIET ZINE";
    mast.appendChild(issue);
    document.getElementById("colophon").innerHTML =
      "<span>" + window.SITE.footerLeft + "</span>" +
      "<span>" + window.SITE.footerRight + "</span>";
    window.addEventListener("hashchange", route);
    route();
  }

  init();
})();
