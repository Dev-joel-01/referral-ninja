import { useEffect, useState, useMemo } from 'react';
import { 
  Briefcase, 
  MapPin, 
  Globe, 
  ExternalLink, 
  Eye,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import type { Task } from '@/types';

type TaskType = 'remote' | 'local_intern' | 'local_job';

// Helper function to get public URL from Supabase Storage
const getTaskImageUrl = (path: string | null): string | null => {
  if (!path) return null;
  
  // If already a full URL, return as-is
  if (path.startsWith('http')) return path;
  
  // Construct Supabase public URL
  const { data } = supabase
    .storage
    .from('task-images')
    .getPublicUrl(path);
    
  return data.publicUrl;
};

export function TaskZonePage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Record<TaskType, Task[]>>({
    remote: [],
    local_intern: [],
    local_job: [],
  });
  const [clickedTasks, setClickedTasks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  useEffect(() => {
    fetchTasks();
    if (user) {
      fetchClickedTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const grouped: Record<TaskType, Task[]> = {
        remote: [],
        local_intern: [],
        local_job: [],
      };

      data?.forEach((task) => {
        if (grouped[task.task_type as TaskType]) {
          grouped[task.task_type as TaskType].push(task);
        }
      });

      setTasks(grouped);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClickedTasks = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('task_clicks')
        .select('task_id')
        .eq('user_id', user.id);

      if (data) {
        setClickedTasks(new Set(data.map((c) => c.task_id)));
      }
    } catch (error) {
      console.error('Error fetching clicked tasks:', error);
    }
  };

  const handleTaskClick = async (task: Task) => {
    if (!user) return;

    try {
      // Record the click
      await supabase.from('task_clicks').upsert({
        task_id: task.id,
        user_id: user.id,
      });

      // Increment click count
      await supabase.rpc('increment_task_clicks', { task_id: task.id });

      // Update local state
      setClickedTasks((prev) => new Set(prev).add(task.id));
      
      // Show dialog
      setSelectedTask(task);
      setShowTaskDialog(true);
    } catch (error) {
      console.error('Error recording task click:', error);
    }
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const isClicked = clickedTasks.has(task.id);
    const Icon = task.task_type === 'remote' ? Globe : MapPin;
    
    // Get the first image URL using the helper
    const imageUrl = useMemo(() => {
      return task.images?.[0] ? getTaskImageUrl(task.images[0]) : null;
    }, [task.images]);

    return (
      <GlassCard padding="md" hover className="cursor-pointer" onClick={() => handleTaskClick(task)}>
        <div className="flex items-start gap-4">
          {/* Image */}
          <div className="w-24 h-24 rounded-xl bg-ninja-black/50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-ninja-green/10">
            {imageUrl ? (
              <img 
                src={imageUrl}
                alt={task.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Failed to load image:', imageUrl);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Briefcase className="w-8 h-8 text-ninja-green/50" />
            )}
          </div>

          {/* Content */}
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
                {task.click_count} clicks
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

  const TaskList = ({ type, title }: { type: TaskType; title: string }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-heading text-ninja-mint">{title}</h2>
        <span className="px-2 py-1 rounded-full bg-ninja-green/20 text-ninja-green text-xs font-mono">
          {tasks[type].length}
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} padding="md" className="animate-pulse">
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-xl bg-ninja-green/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-ninja-green/10 rounded w-1/3" />
                  <div className="h-3 bg-ninja-green/10 rounded w-3/4" />
                  <div className="h-3 bg-ninja-green/10 rounded w-1/2" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : tasks[type].length > 0 ? (
        <div className="grid gap-4">
          {tasks[type].map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <GlassCard padding="lg" className="text-center">
          <Briefcase className="w-12 h-12 text-ninja-green/30 mx-auto mb-4" />
          <p className="text-ninja-sage">No {title.toLowerCase()} available at the moment</p>
        </GlassCard>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-light text-ninja-mint">Task Zone</h1>
        <p className="text-ninja-sage">Browse and apply to available opportunities</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="remote" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-ninja-dark/50 border border-ninja-green/20">
          <TabsTrigger 
            value="remote"
            className="data-[state=active]:bg-ninja-green/20 data-[state=active]:text-ninja-green"
          >
            <Globe className="w-4 h-4 mr-2" />
            Remote
          </TabsTrigger>
          <TabsTrigger 
            value="local_intern"
            className="data-[state=active]:bg-ninja-green/20 data-[state=active]:text-ninja-green"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Local Intern
          </TabsTrigger>
          <TabsTrigger 
            value="local_job"
            className="data-[state=active]:bg-ninja-green/20 data-[state=active]:text-ninja-green"
          >
            <Briefcase className="w-4 h-4 mr-2" />
            Local Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="remote" className="mt-6">
          <TaskList type="remote" title="Remote Jobs" />
        </TabsContent>

        <TabsContent value="local_intern" className="mt-6">
          <TaskList type="local_intern" title="Local Internships" />
        </TabsContent>

        <TabsContent value="local_job" className="mt-6">
          <TaskList type="local_job" title="Local Jobs" />
        </TabsContent>
      </Tabs>

      {/* Task Detail Dialog */}
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
                {/* Images - Fixed to use getTaskImageUrl */}
                {selectedTask.images && selectedTask.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTask.images.map((img, idx) => {
                      const fullUrl = getTaskImageUrl(img);
                      return (
                        <div key={idx} className="aspect-video rounded-xl overflow-hidden border border-ninja-green/10">
                          {fullUrl ? (
                            <img 
                              src={fullUrl}
                              alt={`${selectedTask.title} - ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Failed to load image:', fullUrl);
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-ninja-black/50 flex items-center justify-center">
                              <Briefcase className="w-8 h-8 text-ninja-green/30" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Description */}
                <div className="p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10">
                  <p className="text-ninja-mint whitespace-pre-wrap">{selectedTask.description}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-ninja-sage">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {selectedTask.click_count} people clicked
                  </span>
                </div>

                {/* Action Button */}
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