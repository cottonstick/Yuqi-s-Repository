const form = document.querySelector("#search-form");
const companyInput = document.querySelector("#company");
const newsList = document.querySelector("#news-list");
const earningsSummary = document.querySelector("#earnings-summary");
const sentimentSummary = document.querySelector("#sentiment-summary");
const sentimentTags = document.querySelector("#sentiment-tags");

const sampleData = {
  news: [
    "发布新品与生态合作计划，带动媒体关注度提升。",
    "核心业务板块在海外市场获得新的牌照与合作伙伴。",
    "分析师上调盈利预期，关注成本控制与毛利率改善。",
  ],
  earnings:
    "最新财报显示营收同比增长 12%，主营业务持续扩大，管理层上调全年指引并强调现金流表现稳健。",
  sentiment:
    "市场情绪整体偏积极，但短期仍关注宏观政策与竞争格局变化。",
  tags: ["情绪偏多", "关注利润率", "海外扩张", "政策影响"],
};

const renderList = (items) =>
  items.map((item) => `<li>${item}</li>`).join("");

const renderTags = (items) =>
  items.map((item) => `<span class="tag">${item}</span>`).join("");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const company = companyInput.value.trim();

  if (!company) {
    return;
  }

  const now = new Date();
  const rangeLabel = `${now.getMonth() + 1}月${now.getDate()}日 最近7天`;

  newsList.innerHTML = renderList(
    sampleData.news.map((item) => `${company}：${item}`)
  );
  earningsSummary.innerHTML = `<p><strong>${company}</strong> · ${rangeLabel}</p><p>${sampleData.earnings}</p>`;
  sentimentSummary.innerHTML = `<p><strong>${company}</strong> · ${rangeLabel}</p><p>${sampleData.sentiment}</p>`;
  sentimentTags.innerHTML = renderTags(sampleData.tags);
});
