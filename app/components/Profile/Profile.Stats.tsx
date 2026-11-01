import Link from "next/link";
import ApexCharts from "apexcharts";
import { useEffect } from "react";
import { minutesToTime } from "#/api/utils";
import { ReleaseInfoSearchLink } from "../ReleaseInfo/ReleaseInfo.SearchLink";
import { Icon } from "#/components/Icon/Icon";

type preferredItem = {
  name: string;
  percentage: number;
};

const LISTS = [
  { name: "Смотрю", color: "#66bb6c" },
  { name: "В планах", color: "#b566bb" },
  { name: "Просмотрено", color: "#5c6cc0" },
  { name: "Отложено", color: "#ffca28" },
  { name: "Брошено", color: "#ef5450" },
];

export const ProfileStats = (props: {
  lists: Array<number>;
  watched_count: number;
  watched_time: number;
  profile_id: number;
  preferred_genres: Array<preferredItem>;
  preferred_audiences: Array<preferredItem>;
  preferred_themes: Array<preferredItem>;
}) => {
  const getChartOptions = () => {
    return {
      series: props.lists,
      colors: ["#66bb6c", "#b566bb", "#5c6cc0", "#ffca28", "#ef5450"],
      chart: {
        height: 200,
        width: 200,
        type: "donut",
      },
      stroke: {
        colors: ["transparent"],
        lineCap: "",
      },
      dataLabels: {
        enabled: false,
      },
      labels: [`Смотрю`, `В планах`, `Просмотрено`, `Отложено`, `Брошено`],
      legend: {
        show: false,
      },
      responsive: [
        {
          breakpoint: 400,
          options: {
            chart: {
              height: 170,
              width: 170,
              type: "donut",
            },
          },
        },
        {
          breakpoint: 640,
          options: {
            chart: {
              height: 200,
              width: 200,
              type: "donut",
            },
          },
        },
      ],
    };
  };
  useEffect(() => {
    const container = document.getElementById("donut-chart");
    if (!container || typeof ApexCharts === "undefined") return;

    // Без данных сумма ноль, и график уходит в NaN, поэтому ждём реальных чисел
    const sum = props.lists.reduce((acc, v) => acc + (Number(v) || 0), 0);
    if (sum <= 0) return;

    const chart = new ApexCharts(container, getChartOptions());

    // Рисуем только когда контейнер получил реальную ширину
    const render = () => {
      if (container.clientWidth > 0) chart.render();
    };
    if (container.clientWidth > 0) {
      render();
    } else {
      const observer = new ResizeObserver(() => {
        if (container.clientWidth > 0) {
          observer.disconnect();
          render();
        }
      });
      observer.observe(container);
    }

    return () => {
      try {
        chart.destroy();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lists.join(",")]);

  const total = props.lists.reduce((sum, value) => sum + (value || 0), 0);

  return (
    <div className="box">
      <div className="sh" style={{ marginBottom: 12 }}>
        <h2>
          <Icon name="trend" size={18} />
          Статистика
        </h2>
        <Link href={`/profile/${props.profile_id}/bookmarks`}>
          Показать все
          <Icon name="arrowRight" size={16} />
        </Link>
      </div>

      <div className="stat-donut">
        <div id="donut-chart"></div>
        <div className="legend">
          {LISTS.map((item, index) => (
            <div className="legend-row" key={`list-${item.name}`}>
              <i className="legend-dot" style={{ background: item.color }} />
              {item.name}
              <span className="legend-n">{props.lists[index] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="statgrid" style={{ marginTop: 14 }}>
        <div className="statcard">
          <div className="statcard-k">Всего тайтлов</div>
          <div className="statcard-v">{total}</div>
        </div>
        <div className="statcard">
          <div className="statcard-k">Просмотрено серий</div>
          <div className="statcard-v">{props.watched_count}</div>
        </div>
        <div className="statcard">
          <div className="statcard-k">Время просмотра</div>
          <div className="statcard-v">~{minutesToTime(props.watched_time)}</div>
        </div>
      </div>

      {props.preferred_genres.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="infocell-k" style={{ marginBottom: 6 }}>
            Любимые жанры
          </div>
          <div className="chiprow">
            {props.preferred_genres.map((item) => (
              <span className="chip" key={`preferred-genres-${item.name}`}>
                <ReleaseInfoSearchLink title={item.name} searchBy={"tag"} />
                <span className="muted small">{item.percentage}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {props.preferred_audiences.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="infocell-k" style={{ marginBottom: 6 }}>
            Аудитория
          </div>
          <div className="chiprow">
            {props.preferred_audiences.map((item) => (
              <span className="chip" key={`preferred-audiences-${item.name}`}>
                <ReleaseInfoSearchLink title={item.name} searchBy={"tag"} />
                <span className="muted small">{item.percentage}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {props.preferred_themes.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="infocell-k" style={{ marginBottom: 6 }}>
            Тематика
          </div>
          <div className="chiprow">
            {props.preferred_themes.map((item) => (
              <span className="chip" key={`preferred-themes-${item.name}`}>
                <ReleaseInfoSearchLink title={item.name} searchBy={"tag"} />
                <span className="muted small">{item.percentage}%</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
