"use client";

import { Avatar, type AvatarSize } from "@fluentui/react-components";

export interface PersonAvatarProps {
  name: string;
  /** 프로필 사진 주소. 없거나 불러오기 실패하면 성씨(첫 글자)로 표시 */
  photoUrl?: string | null;
  /** 배경색 결정용 고정 값. 없으면 이름으로 정해진다 */
  colorId?: string;
  size?: AvatarSize;
  className?: string;
}

// Fluent getInitials는 한글을 이니셜 불가 문자로 보고 사람 아이콘을 그리므로 첫 글자를 직접 넘긴다.
// 이름은 옆 텍스트가 읽으므로 아바타는 장식으로 숨긴다.
export function PersonAvatar({ name, photoUrl, colorId, size = 20, className }: PersonAvatarProps): React.ReactElement {
  const initial = Array.from(name.trim())[0] ?? "?";
  return <Avatar name={name} idForColor={colorId} color="colorful" size={size}
    image={photoUrl ? { src: photoUrl, alt: "" } : undefined}
    initials={{ children: initial }} aria-hidden="true" className={className} />;
}
