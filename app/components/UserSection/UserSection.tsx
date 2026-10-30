import Link from "next/link";
import { Icon } from "#/components/Icon/Icon";

export const UserSection = (props: { sectionTitle?: string; content: any }) => {
  return (
    <section className="sec">
      {props.sectionTitle && (
        <div className="sh">
          <h2>{props.sectionTitle}</h2>
        </div>
      )}
      <div className="usergrid">
        {props.content.map((user) => {
          return (
            <Link href={`/profile/${user.id}`} key={user.id} className="row userrow">
              <span className="mini-ava">
                {user.avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt="" />
                )}
              </span>
              <span className="row-body">
                <span className="row-title">{user.login}</span>
              </span>
              <span className="row-right">
                <Icon name="chevron" size={16} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
