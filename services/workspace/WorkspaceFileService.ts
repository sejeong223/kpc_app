import type {
  FileIdentity,
  FileMutation,
  FileOriginalRequest,
  FileProjectCatalog,
  FileReceipt,
  FileRepository,
  FileWorkspaceView,
  WorkspaceProject,
} from "@/types/workspace-files";
import { WorkspaceFileError } from "@/lib/workspace/files/errors";
import {
  canAccessFileProject,
  requireFileProjectAccess,
} from "@/lib/workspace/files/permissions";
import { FileIdentitySchema } from "@/lib/workspace/files/schemas";
import { selectFileWorkspace } from "@/lib/workspace/files/selectors";

export interface WorkspaceFileServiceOptions {
  identity: FileIdentity;
  catalog: FileProjectCatalog;
  repository: FileRepository;
}
export class WorkspaceFileService {
  private closed = false;
  private readonly identity: FileIdentity;
  constructor(private readonly options: WorkspaceFileServiceOptions) {
    const parsed = FileIdentitySchema.safeParse(options.identity);
    if (!parsed.success)
      throw new WorkspaceFileError(
        "UNIDENTIFIED",
        "사용자 정보를 확인해 주세요.",
      );
    this.identity = parsed.data;
  }
  private check(): void {
    if (this.closed)
      throw new WorkspaceFileError(
        "CANCELLED",
        "자료 화면을 다시 불러와 주세요.",
      );
  }
  private project(id: string): WorkspaceProject {
    this.check();
    const project = this.options.catalog.get(id);
    if (!project)
      throw new WorkspaceFileError(
        "NOT_FOUND",
        "접근 가능한 프로젝트를 찾을 수 없습니다.",
      );
    return requireFileProjectAccess(this.identity, project).project;
  }
  private async complete<T>(operation: () => Promise<T>): Promise<T> {
    this.check();
    const result = await operation();
    this.check();
    return result;
  }
  async listProjects(): Promise<WorkspaceProject[]> {
    this.check();
    return this.options.catalog
      .list()
      .filter((project) => canAccessFileProject(this.identity, project))
      .map((project) => structuredClone(project))
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  async loadProject(projectId: string): Promise<FileWorkspaceView> {
    const project = this.project(projectId);
    const view = await this.complete(() =>
      this.options.repository.loadViewContext(projectId),
    );
    return selectFileWorkspace(
      view.files,
      project,
      this.identity,
      view.control,
    );
  }
  execute(input: FileMutation): Promise<FileReceipt> {
    this.project(input.projectId);
    return this.complete(() => this.options.repository.execute(input));
  }
  getOriginal(input: FileOriginalRequest): Promise<File> {
    this.project(input.projectId);
    return this.complete(() => this.options.repository.readOriginal(input));
  }
  getSelection(): Promise<string | null> {
    return this.complete(() => this.options.repository.readSelection());
  }
  selectProject(projectId: string): Promise<void> {
    this.project(projectId);
    return this.complete(() =>
      this.options.repository.saveSelection(projectId),
    );
  }
  close(): void {
    this.closed = true;
    this.options.repository.close();
  }
}
