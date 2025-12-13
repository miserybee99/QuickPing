'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Image, Film, Download, Trash2, Search, Filter, FolderOpen, Loader2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { PageHeader } from '@/components/layout';
import { PageContainer, PageWrapper } from '@/components/layout';
import { getFileUrl } from '@/lib/file-utils';

interface FileItem {
  _id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploader: { _id: string; username: string };
  conversation: { _id: string; name: string };
  created_at: Date;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Files are loaded per conversation in the chat panel
    // This page shows all files from user's conversations
    // For now, show empty state - files are accessed within conversations
    setLoading(false);
    setFiles([]);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Film;
    return FileText;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' ||
      (filterType === 'images' && file.type.startsWith('image/')) ||
      (filterType === 'videos' && file.type.startsWith('video/')) ||
      (filterType === 'documents' && !file.type.startsWith('image/') && !file.type.startsWith('video/'));
    return matchesSearch && matchesType;
  });

  const handleDownload = (file: FileItem) => {
    if (file.url) {
      const downloadUrl = getFileUrl(file.url);
      window.open(downloadUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        icon={FolderOpen}
        title="File Library"
        subtitle={`${files.length} files`}
        showBackButton
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-[250px]"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="images">Images</SelectItem>
                <SelectItem value="videos">Videos</SelectItem>
                <SelectItem value="documents">Documents</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <PageContainer maxWidth="2xl">
        <Tabs defaultValue="grid" className="space-y-6">
          <TabsList>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>

          {/* Grid View */}
          <TabsContent value="grid">
            <ScrollArea className="h-[700px]">
              {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Inbox className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No files yet</p>
                  <p className="text-sm text-center max-w-md">
                    Files shared in your conversations will appear here.
                    <br />
                    Go to a chat and share some files to get started.
                  </p>
                </div>
              ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredFiles.map((file) => {
                  const FileIcon = getFileIcon(file.type);
                  
                  return (
                    <motion.div
                      key={file._id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      className="group"
                    >
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="aspect-square rounded-lg bg-muted flex items-center justify-center mb-3 relative overflow-hidden">
                            {file.type.startsWith('image/') && file.url ? (
                              <img
                                src={getFileUrl(file.url)}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileIcon className="h-16 w-16 text-muted-foreground" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button size="sm" variant="secondary" onClick={() => handleDownload(file)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="font-medium truncate text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {file.conversation.name}
                          </Badge>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list">
            <ScrollArea className="h-[700px]">
              {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Inbox className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No files yet</p>
                  <p className="text-sm text-center max-w-md">
                    Files shared in your conversations will appear here.
                    <br />
                    Go to a chat and share some files to get started.
                  </p>
                </div>
              ) : (
              <div className="space-y-2">
                {filteredFiles.map((file) => {
                  const FileIcon = getFileIcon(file.type);
                  
                  return (
                    <motion.div
                      key={file._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Card className="hover:bg-accent/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-muted">
                              <FileIcon className="h-6 w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{file.name}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{formatFileSize(file.size)}</span>
                                <span>•</span>
                                <span>{file.uploader.username}</span>
                                <span>•</span>
                                <span>
                                  {formatDistanceToNow(file.created_at, {
                                    addSuffix: true,
                                    locale: enUS,
                                  })}
                                </span>
                              </div>
                              <Badge variant="secondary" className="mt-2">
                                {file.conversation.name}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleDownload(file)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </PageWrapper>
  );
}

