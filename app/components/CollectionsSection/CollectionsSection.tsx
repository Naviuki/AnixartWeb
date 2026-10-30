import { CollectionLink } from "../CollectionLink/CollectionLink";
import { AddCollectionLink } from "../AddCollectionLink/AddCollectionLink";

export const CollectionsSection = (props: {
  sectionTitle?: string;
  content: any;
  isMyCollections?: boolean;
}) => {
  return (
    <section className="sec">
      {props.sectionTitle && (
        <div className="sh">
          <h2>{props.sectionTitle}</h2>
        </div>
      )}
      <div className="grid grid-coll">
        {props.isMyCollections && <AddCollectionLink />}
        {props.content.map((collection) => {
          return (
            <div key={collection.id} className="w-full h-full">
              <CollectionLink {...collection} />
            </div>
          );
        })}
      </div>
    </section>
  );
};
