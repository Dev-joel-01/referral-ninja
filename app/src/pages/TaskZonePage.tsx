import { useState, useMemo, useCallback } from 'react';
import { 
  Briefcase, 
  MapPin, 
  Globe, 
  ExternalLink, 
  Eye,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/layout/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { Task } from '@/types';

type TaskType = 'remote' | 'local_intern' | 'local_job';

// Query key factory for granular cache control
const taskKeys = {
  all: ['tasks'] as const,
  list: (type?: TaskType) => [...taskKeys.all, 'list', type] as const,
  clicked: (userId: string) => [...taskKeys.all, 'clicked', userId] as const,
};

// Helper to get image URL - handles multiple formats
const getTaskImageUrl = (path: string | null): string | null => {
  if (!path) return null;
  
  if (path.startsWith('http')) {
    if (path.includes('supabase.co/storage/v1/object/public/task-images/')) {
      return path;
    }
    return path;
  }
  
  const { data } = supabase.storage.from('task-images').getPublicUrl(path);
  return data?.publicUrl || null;
};

// Optimized data fetching with caching
const fetchTasks = async (type?: TaskType): Promise<Task[]> => {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (type) {
    query = query.eq('task_type', type);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

const fetchClickedTasks = async (userId: string): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('task_clicks')
    .select('task_id')
    .eq('user_id', userId);
  
  if (error) throw error;
  return new Set(data?.map((c) => c.task_id) || []);
};

export function TaskZonePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TaskType>('remote');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // TanStack Query: Cached tasks with automatic background updates
  const { 
    data: tasks = [], 
    isLoading, 
    isFetching,
    error 
  } = useQuery({
    queryKey: taskKeys.list(activeTab),
    queryFn: () => fetchTasks(activeTab),
    staleTime: 5 * 60 * 1000, // 5 minutes - tasks don't change often
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: process.env.NODE_ENV === 'production',
    placeholderData: (previousData) => previousData, // Keep old data while fetching new
  });

  // TanStack Query: Cached clicked tasks
  const { data: clickedTasks = new Set() } = useQuery({
    queryKey: taskKeys.clicked(user?.id || 'anonymous'),
    queryFn: () => (user ? fetchClickedTasks(user.id) : new Set<string>()),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes - clicks change more frequently
  });

  // TanStack Query: Optimistic mutation for task clicks
  const clickMutation = useMutation({
    mutationFn: async (task: Task) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error: clickError } = await supabase
        .from('task_clicks')
        .insert({ task_id: task.id, user_id: user.id });
      
      if (clickError) throw clickError;
      
      await supabase
        .from('tasks')
        .update({ click_count: (task.click_count || 0) + 1 })
        .eq('id', task.id);
      
      return task.id;
    },
    onMutate: async (task) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.list(activeTab) });
      
      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.list(activeTab));
      
      // Optimistically update click count
      queryClient.setQueryData<Task[]>(taskKeys.list(activeTab), (old) => 
        old?.map(t => t.id === task.id 
          ? { ...t, click_count: (t.click_count || 0) + 1 } 
          : t
        ) || []
      );
      
      // Optimistically add to clicked set
      queryClient.setQueryData(
        taskKeys.clicked(user?.id || ''), 
        (old: Set<string> = new Set()) => new Set([...old, task.id])
      );
      
      return { previousTasks };
    },
    onError: (err, task, context) => {
      // Rollback on error
      queryClient.setQueryData(taskKeys.list(activeTab), context?.previousTasks);
    },
    onSettled: () => {
      // Ensure eventual consistency
      queryClient.invalidateQueries({ queryKey: taskKeys.list(activeTab) });
      queryClient.invalidateQueries({ queryKey: taskKeys.clicked(user?.id || '') });
    },
  });

  // Prefetch other tabs on hover for instant switching
  const prefetchTab = useCallback((type: TaskType) => {
    queryClient.prefetchQuery({
      queryKey: taskKeys.list(type),
      queryFn: () => fetchTasks(type),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  const handleTaskClick = useCallback((task: Task) => {
    if (!user) {
      setSelectedTask(task);
      setShowTaskDialog(true);
      return;
    }

    clickMutation.mutate(task, {
      onSuccess: () => {
        setSelectedTask(task);
        setShowTaskDialog(true);
      },
      onError: () => {
        // Still show dialog even if tracking failed
        setSelectedTask(task);
        setShowTaskDialog(true);
      },
    });
  }, [user, clickMutation]);

  const handleImageError = useCallback((url: string) => {
    setImageErrors(prev => new Set(prev).add(url));
  }, []);

  // Memoized task card to prevent unnecessary re-renders
  const TaskCard = useMemo(() => {
    const CardComponent = ({ task }: { task: Task }) => {
      const isClicked = clickedTasks.has(task.id);
      const Icon = task.task_type === 'remote' ? Globe : MapPin;
      
      const imageUrl = task.images?.[0] ? getTaskImageUrl(task.images[0]) : null;
      const hasImageError = imageUrl ? imageErrors.has(imageUrl) : false;

      return (
        <GlassCard 
          padding="md" 
          hover 
          className="cursor-pointer transition-all duration-200" 
          onClick={() => handleTaskClick(task)}
        >
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-xl bg-ninja-black/50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-ninja-green/10">
              {imageUrl && !hasImageError ? (
                <img 
                  src={imageUrl}
                  alt={task.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={() => handleImageError(imageUrl!)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-ninja-sage">
                  <Briefcase className="w-8 h-8 text-ninja-green/50 mb-1" />
                  {hasImageError && <span className="text-[10px]">Image error</span>}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-ninja-green" />
                    <span className="text-xs text-ninja-sage uppercase tracking-wider">
                      {task.task_type === 'remote' && 'Remote Job'}
                      {task.task_type === 'local_intern' && 'Local Internship'}
                      {task.task_type === 'local_job' && 'Local Job'}
                    </span>
                  </div>
                  <h3 className="text-ninja-mint font-medium truncate">{task.title}</h3>
                </div>
                {isClicked && (
                  <CheckCircle className="w-5 h-5 text-ninja-green flex-shrink-0" />
                )}
              </div>

              <p className="text-ninja-sage text-sm line-clamp-2 mt-2">{task.description}</p>

              <div className="flex items-center gap-4 mt-3 text-xs text-ninja-sage">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {task.click_count || 0} clicks
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(task.created_at), 'dd MMM')}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      );
    };
    
    // Memoize the component itself
    return CardComponent;
  }, [clickedTasks, imageErrors, handleTaskClick, handleImageError]);

  // Loading skeleton that matches final layout (prevents CLS)
  const TaskSkeleton = () => (
    <GlassCard padding="md" className="animate-pulse">
      <div className="flex gap-4">
        <Skeleton className="w-24 h-24 rounded-xl bg-ninja-green/10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 bg-ninja-green/10 rounded w-1/3" />
          <Skeleton className="h-3 bg-ninja-green/10 rounded w-3/4" />
          <Skeleton className="h-3 bg-ninja-green/10 rounded w-1/2" />
        </div>
      </div>
    </GlassCard>
  );

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load tasks. Retrying...</p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: taskKeys.all })}
          className="mt-4 px-4 py-2 bg-ninja-green text-ninja-black rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-light text-ninja-mint">Task Zone</h1>
        <p className="text-ninja-sage">Browse and apply to available opportunities</p>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={(v) => setActiveTab(v as TaskType)} 
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 bg-ninja-dark/50 border border-ninja-green/20">
          <TabsTrigger 
            value="remote"
            onMouseEnter={() => prefetchTab('remote')}
            className="data-[state=active]:bg-ninja-green/20 data-[state=active]:text-ninja-green"
          >
            <Globe className="w-4 h-4 mr-2" />
            Remote
            {isFetching && activeTab === 'remote' && (
              <span className="ml-2 animate-spin text-xs">⟳</span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="local_intern"
            onMouseEnter={() => prefetchTab('local_intern')}
            className="data-[state=active]:bg-ninja-green/20 data-[state=active]:text-ninja-green"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Local Intern
            {isFetching && activeTab === 'local_intern' && (
              <span className="ml-2 animate-spin text-xs">⟳</span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="local_job"
            onMouseEnter={() => prefetchTab('local_job')}
            className="data-[state=active]:bg-ninja-green/20 data-[state=active]:text-ninja-green"
          >
            <Briefcase className="w-4 h-4 mr-2" />
            Local Jobs
            {isFetching && activeTab === 'local_job' && (
              <span className="ml-2 animate-spin text-xs">⟳</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="remote" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-heading text-ninja-mint">Remote Jobs</h2>
              <span className="px-2 py-1 rounded-full bg-ninja-green/20 text-ninja-green text-xs font-mono">
                {tasks.length}
              </span>
            </div>

            {isLoading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <TaskSkeleton key={i} />
                ))}
              </div>
            ) : tasks.length > 0 ? (
              <div className="grid gap-4">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <GlassCard padding="lg" className="text-center">
                <Briefcase className="w-12 h-12 text-ninja-green/30 mx-auto mb-4" />
                <p className="text-ninja-sage">No remote jobs available at the moment</p>
              </GlassCard>
            )}
          </div>
        </TabsContent>

        <TabsContent value="local_intern" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-heading text-ninja-mint">Local Internships</h2>
              <span className="px-2 py-1 rounded-full bg-ninja-green/20 text-ninja-green text-xs font-mono">
                {tasks.length}
              </span>
            </div>

            {isLoading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <TaskSkeleton key={i} />
                ))}
              </div>
            ) : tasks.length > 0 ? (
              <div className="grid gap-4">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <GlassCard padding="lg" className="text-center">
                <Briefcase className="w-12 h-12 text-ninja-green/30 mx-auto mb-4" />
                <p className="text-ninja-sage">No internships available at the moment</p>
              </GlassCard>
            )}
          </div>
        </TabsContent>

        <TabsContent value="local_job" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-heading text-ninja-mint">Local Jobs</h2>
              <span className="px-2 py-1 rounded-full bg-ninja-green/20 text-ninja-green text-xs font-mono">
                {tasks.length}
              </span>
            </div>

            {isLoading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <TaskSkeleton key={i} />
                ))}
              </div>
            ) : tasks.length > 0 ? (
              <div className="grid gap-4">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <GlassCard padding="lg" className="text-center">
                <Briefcase className="w-12 h-12 text-ninja-green/30 mx-auto mb-4" />
                <p className="text-ninja-sage">No local jobs available at the moment</p>
              </GlassCard>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-lg">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {selectedTask.task_type === 'remote' ? (
                    <Globe className="w-4 h-4 text-ninja-green" />
                  ) : (
                    <MapPin className="w-4 h-4 text-ninja-green" />
                  )}
                  <span className="text-xs text-ninja-sage uppercase tracking-wider">
                    {selectedTask.task_type === 'remote' && 'Remote Job'}
                    {selectedTask.task_type === 'local_intern' && 'Local Internship'}
                    {selectedTask.task_type === 'local_job' && 'Local Job'}
                  </span>
                </div>
                <DialogTitle className="text-2xl font-heading text-ninja-mint">
                  {selectedTask.title}
                </DialogTitle>
                <DialogDescription className="text-ninja-sage">
                  Posted {format(new Date(selectedTask.created_at), 'dd MMMM yyyy')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedTask.images && selectedTask.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTask.images.map((img, idx) => {
                      const fullUrl = getTaskImageUrl(img);
                      const hasError = fullUrl ? imageErrors.has(fullUrl) : false;
                      
                      return (
                        <div key={idx} className="aspect-video rounded-xl overflow-hidden border border-ninja-green/10">
                          {fullUrl && !hasError ? (
                            <img 
                              src={fullUrl}
                              alt={`${selectedTask.title} - ${idx + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={() => fullUrl && handleImageError(fullUrl)}
                            />
                          ) : (
                            <div className="w-full h-full bg-ninja-black/50 flex flex-col items-center justify-center">
                              <Briefcase className="w-8 h-8 text-ninja-green/30 mb-1" />
                              {hasError && <span className="text-[10px] text-ninja-sage">Failed to load</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10">
                  <p className="text-ninja-mint whitespace-pre-wrap">{selectedTask.description}</p>
                </div>

                <div className="flex items-center gap-4 text-sm text-ninja-sage">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {selectedTask.click_count || 0} people clicked
                  </span>
                </div>

                {selectedTask.website_link && (
                  <a
                    href={selectedTask.website_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Website
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}