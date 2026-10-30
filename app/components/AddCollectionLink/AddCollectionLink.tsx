import Link from "next/link";
import { Icon } from "#/components/Icon/Icon";

export const AddCollectionLink = (props: any) => {
  return (
    <Link href={`/collections/create`} className="coll-new">
      <Icon name="plus" size={26} />
      <span>Новая коллекция</span>
    </Link>
  );
};
