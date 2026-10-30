import Link from "next/link";
import Image from "next/image";
import { ReleaseChips } from "../ReleasePoster/Chips";
import { getFixedGrade, getUserList } from "#/api/utils";

export const ReleaseLinkList = (props: {
  image: string;
  title_ru: string;
  title_original: string;
  description?: string;
  genres?: string;
  grade?: number;
  id: number;
  settings?: {
    showGenres?: boolean;
    showDescription?: boolean;
    showOrigTitle?: boolean;
  };
  chipsSettings?: {
    enabled: boolean;
    gradeHidden?: boolean;
    statusHidden?: boolean;
    categoryHidden?: boolean;
    episodesHidden?: boolean;
    listHidden?: boolean;
    favHidden?: boolean;
  };
  profile_list_status?: number;
  status?: {
    name: string;
  };
  category?: {
    name: string;
  };
  status_id?: number;
  episodes_released?: string;
  episodes_total?: string;
  is_favorite?: boolean;
}) => {
  const settings = {
    showGenres: true,
    showDescription: true,
    showOrigTitle: true,
    ...props.settings,
  };

  const grade = getFixedGrade(props.grade);
  const profile_list_status = props.profile_list_status || null;
  const user_list = getUserList(profile_list_status);

  return (
    <Link href={`/release/${props.id}`} className="row">
      <span className="row-poster">
        <Image
          src={props.image}
          alt={props.title_ru || ""}
          fill
          sizes="56px"
          className="object-cover"
        />
      </span>
      <span className="row-body">
        <span className="row-title">{props.title_ru}</span>
        {settings.showOrigTitle && props.title_original && (
          <span className="row-sub">{props.title_original}</span>
        )}
        <ReleaseChips {...props} user_list={user_list} grade={grade} />
        {settings.showGenres && props.genres && (
          <span className="row-sub">{props.genres}</span>
        )}
        {settings.showDescription && props.description && (
          <span className="row-sub row-desc">{props.description}</span>
        )}
      </span>
    </Link>
  );
};
