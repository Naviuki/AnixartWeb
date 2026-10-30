import Markdown from "markdown-to-jsx";
import Styles from "./ChangelogModal.module.css";

export const ChangelogMarkdown = ({ content }: { content: string }) => {
  return <Markdown className={Styles.markdown}>{content}</Markdown>;
};

export const ChangelogAccordion = ({
  callback,
  contents,
}: {
  callback?: any;
  contents: Record<string, string>;
}) => {
  return (
    <div className="acc">
      {Object.keys(contents).map((key) => {
        return (
          <details className="acc-item" key={`changelog-accordion-${key}`}>
            <summary onClickCapture={callback ? () => callback(key) : undefined}>
              {key}
            </summary>
            <div className="acc-body">
              <ChangelogMarkdown
                content={contents[key] != "" ? contents[key] : "Загрузка ..."}
              />
            </div>
          </details>
        );
      })}
    </div>
  );
};
