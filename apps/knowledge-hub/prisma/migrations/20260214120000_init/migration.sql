-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "knowledge";

-- CreateTable
CREATE TABLE "knowledge"."wikis" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wikis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge"."wiki_members" (
    "id" TEXT NOT NULL,
    "wikiId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wiki_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge"."wiki_project_links" (
    "id" TEXT NOT NULL,
    "wikiId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wiki_project_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge"."wiki_pages" (
    "id" TEXT NOT NULL,
    "wikiId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wiki_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge"."wiki_page_versions" (
    "id" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wiki_page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge"."document_folders" (
    "id" TEXT NOT NULL,
    "wikiId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge"."documents" (
    "id" TEXT NOT NULL,
    "wikiId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge"."document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge"."document_permissions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "roleId" TEXT,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wiki_members_wikiId_userId_key" ON "knowledge"."wiki_members"("wikiId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "wiki_project_links_wikiId_key" ON "knowledge"."wiki_project_links"("wikiId");

-- CreateIndex
CREATE UNIQUE INDEX "wiki_project_links_projectId_key" ON "knowledge"."wiki_project_links"("projectId");

-- AddForeignKey
ALTER TABLE "knowledge"."wiki_members" ADD CONSTRAINT "wiki_members_wikiId_fkey" FOREIGN KEY ("wikiId") REFERENCES "knowledge"."wikis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge"."wiki_project_links" ADD CONSTRAINT "wiki_project_links_wikiId_fkey" FOREIGN KEY ("wikiId") REFERENCES "knowledge"."wikis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge"."wiki_pages" ADD CONSTRAINT "wiki_pages_wikiId_fkey" FOREIGN KEY ("wikiId") REFERENCES "knowledge"."wikis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge"."wiki_pages" ADD CONSTRAINT "wiki_pages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "knowledge"."wiki_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge"."wiki_page_versions" ADD CONSTRAINT "wiki_page_versions_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "knowledge"."wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge"."document_folders" ADD CONSTRAINT "document_folders_wikiId_fkey" FOREIGN KEY ("wikiId") REFERENCES "knowledge"."wikis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge"."document_folders" ADD CONSTRAINT "document_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "knowledge"."document_folders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge"."documents" ADD CONSTRAINT "documents_wikiId_fkey" FOREIGN KEY ("wikiId") REFERENCES "knowledge"."wikis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge"."documents" ADD CONSTRAINT "documents_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "knowledge"."document_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge"."document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge"."document_permissions" ADD CONSTRAINT "document_permissions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
