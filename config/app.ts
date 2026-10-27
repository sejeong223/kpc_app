export interface AppConfig {
  name: string;
  description: string;
}

export const appConfig: AppConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Azure App Template",
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Azure 기반 업무 애플리케이션 템플릿",
};
