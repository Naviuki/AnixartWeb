interface UserRoleProps {
  name: string;
  color: string;
}

// Роль профиля: цвет берётся из данных API.
export const UserRole = ({ name, color }: UserRoleProps) => {
  return (
    <span
      className="badge"
      style={
        {
          "--color": `#${color}`,
          color: `#${color}`,
          borderColor: `color-mix(in srgb, #${color} 45%, transparent)`,
          background: `color-mix(in srgb, #${color} 12%, transparent)`,
        } as React.CSSProperties
      }
    >
      {name}
    </span>
  );
};
