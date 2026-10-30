import Image from "next/image";

export const Poster = (props: {
  image: string;
  alt?: string;
  className?: string;
}) => {
  return (
    <Image
      className={`object-cover w-full h-auto ${props.className || ""}`}
      src={props.image}
      alt={props.alt || ""}
      width={285}
      height={385}
    />
  );
};
