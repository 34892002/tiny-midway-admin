import { Provide, Inject } from '@midwayjs/core';
import { PrismaClient, Prisma, File } from '@prisma/client';
import { unlinkSync } from 'fs';
import { join } from 'path';

@Provide()
export class FileService {
  @Inject()
  prisma: PrismaClient;

  public async findAll(where: Partial<File>, options: any): Promise<{ records: File[]; total: number; currentPage: number; pageSize: number }> {
    const { select, include, sort = { id: 'desc' }, page = 1, limit = 20 } = options;
    const orderBy = typeof sort === 'string' ? JSON.parse(sort) : sort;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    // options
    const queryOptions = {
      where,
      orderBy,
      skip,
      take,
      select,
      include
    } as Prisma.FileFindManyArgs;
    const [rows, count] = await Promise.all([
      this.prisma.file.findMany(queryOptions),
      this.prisma.file.count({ where }),
    ]);
    return { records: rows, total: count, currentPage: page, pageSize: limit };
  }

  async createFile(data: any) {
    return await this.prisma.file.create({
      data: {
        fileName: data.fileName,
        filePath: data.filePath,
        mimeType: data.mimeType,
        size: data.size,
        categoryId: data.categoryId,
        source: data.source,
        userId: data.userId, // 上传者 ID
        remark: data.remark,
      },
    });
  }

  async getTypes() {
    return this.prisma.fileCategory.findMany({
      orderBy: { id: 'desc' }
    });
  }

  async addType(name: string) {
    try {
      const res = await this.prisma.fileCategory.create({
        data: {
          name,
        },
      });
      return res;
    } catch (error) {
      if (error.code === 'P2002') throw new Error('已存在的分类名称');
      throw error;
    }

  }

  async delType(id: number) {
    try {
      const isSystem = await this.prisma.fileCategory.findUnique({ where: { id } }).then(res => res?.system);
      if (isSystem) throw new Error('系统分类不能删除');
      const count = await this.prisma.file.count({ where: { categoryId: id } });
      if (count > 0) throw new Error('该分类下还有文件，请先删除该分类下的所有文件');
      const res = await this.prisma.fileCategory.delete(
        { where: {id, system: false} }
      )
      return res;
    } catch (error) {
      if (error.code === 'P2025') throw new Error('不能删除系统分类');
      throw error;
    }
  }

  async delFile(ids: number[]) {
    const files = await this.prisma.file.findMany({ where: { id: { in: ids } } });
    const root = process.cwd();
    // 同步删除文件
    files.forEach(file => {
      const path = join(root, 'download', file.filePath);
      unlinkSync(path);
    });
    return this.prisma.file.deleteMany(
      { where: { id: {in: ids} } }
    )
  }
}
