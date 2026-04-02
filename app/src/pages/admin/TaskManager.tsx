import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ExternalLink,
  Eye,
  X,
  Upload,
  Globe,
  MapPin
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Task } from '@/types';

const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  taskType: z.enum(['remote', 'local_intern', 'local_job']),
  websiteLink: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type TaskFormData = z.infer<typeof taskSchema>;

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  });

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).slice(0, 4 - images.length);
      setImages((prev) => [...prev, ...newFiles]);
      
      newFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const image of images) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('task-images')
        .upload(fileName, image);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('task-images')
        .getPublicUrl(fileName);
      
      urls.push(publicUrl);
    }
    
    return urls;
  };

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    
    try {
      const imageUrls = images.length > 0 ? await uploadImages() : [];
      
      const { error } = await supabase.from('tasks').insert({
        title: data.title,
        description: data.description,
        task_type: data.taskType,
        website_link: data.websiteLink || null,
        images: imageUrls,
        is_active: true,
      });

      if (error) throw error;

      setShowCreateDialog(false);
      reset();
      setImages([]);
      setImagePreviews([]);
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEdit = async (data: TaskFormData) => {
    if (!selectedTask) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: data.title,
          description: data.description,
          task_type: data.taskType,
          website_link: data.websiteLink || null,
        })
        .eq('id', selectedTask.id);

      if (error) throw error;

      setShowEditDialog(false);
      setSelectedTask(null);
      reset();
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!selectedTask) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;

      setShowDeleteDialog(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setValue('title', task.title);
    setValue('description', task.description);
    setValue('taskType', task.task_type as any);
    setValue('websiteLink', task.website_link || '');
    setShowEditDialog(true);
  };

  const openDeleteDialog = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteDialog(true);
  };

  const TaskList = ({ type, title }: { type: string; title: string }) => {
    const filteredTasks = tasks.filter((t) => t.task_type === type);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-heading text-ninja-mint">{title}</h2>
          <span className="px-2 py-1 rounded-full bg-ninja-green/20 text-ninja-green text-xs font-mono">
            {filteredTasks.length}
          </span>
        </div>

        {filteredTasks.length > 0 ? (
          <div className="grid gap-4">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {task.task_type === 'remote' ? (
                        <Globe className="w-4 h-4 text-ninja-green" />
                      ) : (
                        <MapPin className="w-4 h-4 text-ninja-green" />
                      )}
                      <span className="text-xs text-ninja-sage uppercase tracking-wider">
                        {task.task_type === 'remote' && 'Remote'}
                        {task.task_type === 'local_intern' && 'Local Intern'}
                        {task.task_type === 'local_job' && 'Local Job'}
                      </span>
                    </div>
                    <h3 className="text-ninja-mint font-medium mb-1">{task.title}</h3>
                    <p className="text-ninja-sage text-sm line-clamp-2">{task.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-ninja-sage">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {task.click_count} clicks
                      </span>
                      <span>{format(new Date(task.created_at), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.website_link && (
                      <a
                        href={task.website_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-ninja-green/20 text-ninja-green hover:bg-ninja-green/30 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => openEditDialog(task)}
                      className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteDialog(task)}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-ninja-sage text-center py-8">No tasks found</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-light text-ninja-mint">Task Manager</h1>
          <p className="text-ninja-sage">Manage tasks and opportunities</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Tasks Tabs */}
      <Tabs defaultValue="remote" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-ninja-dark/50 border border-ninja-green/20">
          <TabsTrigger 
            value="remote"
            className="data-[state=active]:bg-ninja-green/20 data-[state=active]:text-ninja-green"
          >
            Remote Jobs
          </TabsTrigger>
          <TabsTrigger 
            value="local_intern"
            className="data-[state=active]:bg-ninja-green/20 data-[state=active]:text-ninja-green"
          >
            Local Interns
          </TabsTrigger>
          <TabsTrigger 
            value="local_job"
            className="data-[state=active]:bg-ninja-green/20 data-[state=active]:text-ninja-green"
          >
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading text-ninja-mint">
              Add New Task
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-ninja-mint">Title</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Task title"
                className={cn('input-field', errors.title && 'border-red-500/50')}
              />
              {errors.title && <p className="text-red-400 text-sm">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskType" className="text-ninja-mint">Task Type</Label>
              <select
                id="taskType"
                {...register('taskType')}
                className="w-full input-field"
              >
                <option value="remote">Remote Job</option>
                <option value="local_intern">Local Internship</option>
                <option value="local_job">Local Job</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-ninja-mint">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Task description"
                rows={4}
                className={cn('input-field resize-none', errors.description && 'border-red-500/50')}
              />
              {errors.description && <p className="text-red-400 text-sm">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteLink" className="text-ninja-mint">Website Link (Optional)</Label>
              <Input
                id="websiteLink"
                {...register('websiteLink')}
                placeholder="https://example.com"
                className={cn('input-field', errors.websiteLink && 'border-red-500/50')}
              />
              {errors.websiteLink && <p className="text-red-400 text-sm">{errors.websiteLink.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-ninja-mint">Images (Optional, max 4)</Label>
              <div className="grid grid-cols-4 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-ninja-green/20">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 4 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-ninja-green/30 flex flex-col items-center justify-center cursor-pointer hover:border-ninja-green/50 transition-colors">
                    <Upload className="w-6 h-6 text-ninja-sage mb-1" />
                    <span className="text-xs text-ninja-sage">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full btn-primary h-12">
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading text-ninja-mint">
              Edit Task
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-ninja-mint">Title</Label>
              <Input
                id="edit-title"
                {...register('title')}
                className={cn('input-field', errors.title && 'border-red-500/50')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-taskType" className="text-ninja-mint">Task Type</Label>
              <select
                id="edit-taskType"
                {...register('taskType')}
                className="w-full input-field"
              >
                <option value="remote">Remote Job</option>
                <option value="local_intern">Local Internship</option>
                <option value="local_job">Local Job</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-ninja-mint">Description</Label>
              <Textarea
                id="edit-description"
                {...register('description')}
                rows={4}
                className={cn('input-field resize-none', errors.description && 'border-red-500/50')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-websiteLink" className="text-ninja-mint">Website Link</Label>
              <Input
                id="edit-websiteLink"
                {...register('websiteLink')}
                className={cn('input-field', errors.websiteLink && 'border-red-500/50')}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full btn-primary h-12">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading text-ninja-mint">
              Delete Task
            </DialogTitle>
            <DialogDescription className="text-ninja-sage">
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => setShowDeleteDialog(false)}
              variant="outline"
              className="flex-1 btn-outline"
            >
              Cancel
            </Button>
            <Button
              onClick={onDelete}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
