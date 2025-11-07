'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Image, Film, Download, Trash2, Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import vi from 'date-fns/locale/vi';

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

// Mock data
const mockFiles: FileItem[] = [
  {
    _id: '1',
    name: 'presentation.pdf',
    type: 'application/pdf',
    size: 2500000,
    url: '',
    uploader: { _id: '1', username: 'nguyenvana' },
    conversation: { _id: '1', name: 'Nhóm học tập' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    _id: '2',
    name: 'screenshot.png',
    type: 'image/png',
    size: 1200000,
    url: '',
    uploader: { _id: '2', username: 'tranthib' },
    conversation: { _id: '2', name: 'Project Team' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
];

export default function FilesPage() {
  const router = useRouter();
  const [files] = useState(mockFiles);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <X className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">Thư viện file</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[300px]"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="images">Hình ảnh</SelectItem>
                  <SelectItem value="videos">Video</SelectItem>
                  <SelectItem value="documents">Tài liệu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="grid" className="space-y-6">
          <TabsList>
            <TabsTrigger value="grid">Lưới</TabsTrigger>
            <TabsTrigger value="list">Danh sách</TabsTrigger>
          </TabsList>

          {/* Grid View */}
          <TabsContent value="grid">
            <ScrollArea className="h-[700px]">
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
                            {file.type.startsWith('image/') ? (
                              <img
                                src={file.url || 'https://via.placeholder.com/200'}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileIcon className="h-16 w-16 text-muted-foreground" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button size="sm" variant="secondary">
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
            </ScrollArea>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list">
            <ScrollArea className="h-[700px]">
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
                                    locale: vi,
                                  })}
                                </span>
                              </div>
                              <Badge variant="secondary" className="mt-2">
                                {file.conversation.name}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                Tải
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
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

