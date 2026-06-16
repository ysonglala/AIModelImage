import Link from "next/link";
import { listTasks } from "../../lib/task-store";

export default async function DashboardPage() {
  const tasks = await listTasks();

  return (
    <main className="grain">
      <div className="shell pageWrap">
        <nav className="nav glass">
          <div className="brand">
            <div className="logoMark" />
            <div>
              <div className="brandTitle">Fabric Muse / 历史任务</div>
              <div className="brandSub">任务面板 · 复用参数 · 快速查看状态</div>
            </div>
          </div>
          <div className="navLinks">
            <Link className="pill" href="/">
              返回首页
            </Link>
            <Link className="button" href="/#builder">
              新建任务
            </Link>
          </div>
        </nav>

        <header className="pageHeader glass">
          <div className="eyebrow">Dashboard / 真实任务 + Mock</div>
          <h1>我的任务</h1>
          <p>
            这个页面先用内存 mock 数据跑通“列表 → 查看详情”的基本路径。真接数据库以后，这里就能变成你的任务历史、模板复用和失败排查面板。
          </p>
        </header>

        <section className="sectionCard glass">
          <div className="sectionTitle">
            <div>
              <h2>任务列表</h2>
              <p className="sectionDesc">当前共 {tasks.length} 个任务。状态颜色、筛选、搜索和分页后面都可以慢慢补，现在先别把自己搞复杂。</p>
            </div>
          </div>

          <div className="historyList">
            {tasks.map((task) => (
              <div className="historyItem" key={task.id}>
                <div
                  className="historyThumb"
                  style={{ backgroundImage: `url(${task.resultImages[0] || task.referenceImages.garment || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80"})` }}
                />
                <div className="historyMeta">
                  <h4>{task.title}</h4>
                  <p>
                    {task.status.toUpperCase()} · {task.taskType} · {task.aspectRatio} · {task.imageCount} 张
                  </p>
                  <p>{task.prompt.slice(0, 78)}...</p>
                </div>
                <Link className="smallButton" href={`/tasks/${task.id}`}>
                  查看详情
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
