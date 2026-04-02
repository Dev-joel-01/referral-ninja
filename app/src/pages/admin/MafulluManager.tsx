import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Trash2, 
  Upload,
  X,
  Check,
  Lock,
  Unlock
} from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const mafulluSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
});

type MafulluFormData = z.infer<typeof mafulluSchema>;

interface MafulluContent {
  id: string;
  title: string;
  content: string;
  images: string[];
  is_purchased: boolean;
  purchased_by: string | null;
  purchased_at: string | null;
  created_at: string;
}

export function MafulluManager() {
  const [contents, setContents] = useState<MafulluContent[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedContent, setSelectedContent] = useState<MafulluContent | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MafulluFormData>({
    resolver: zodResolver(mafulluSchema),
  });

  const fetchContents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mafullu_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error fetching mafullu content:', error);
    }
  }, []);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

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
        .from('mafullu-images')
        .upload(fileName, image);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('mafullu-images')
        .getPublicUrl(fileName);
      
      urls.push(publicUrl);
    }
    
    return urls;
  };

  const onSubmit = async (data: MafulluFormData) => {
    setIsSubmitting(true);
    
    try {
      const imageUrls = images.length > 0 ? await uploadImages() : [];
      
      const { error } = await supabase.from('mafullu_content').insert({
        title: data.title,
        content: data.content,
        images: imageUrls,
        is_purchased: false,
      });

      if (error) throw error;

      setShowCreateDialog(false);
      reset();
      setImages([]);
      setImagePreviews([]);
      fetchContents();
    } catch (error) {
      console.error('Error creating mafullu content:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!selectedContent) return;
    
    try {
      const { error } = await supabase
        .from('mafullu_content')
        .delete()
        .eq('id', selectedContent.id);

      if (error) throw error;

      setShowDeleteDialog(false);
      setSelectedContent(null);
      fetchContents();
    } catch (error) {
      console.error('Error deleting mafullu content:', error);
    }
  };

  const openDeleteDialog = (content: MafulluContent) => {
    setSelectedContent(content);
    setShowDeleteDialog(true);
  };

  const availableCount = contents.filter((c) => !c.is_purchased).length;
  const purchasedCount = contents.filter((c) => c.is_purchased).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-light text-ninja-mint">Mafullu Manager</h1>
          <p className="text-ninja-sage">Manage premium content packs</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Content
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard padding="md">
          <p className="stat-label">Total Content</p>
          <p className="stat-value">{contents.length}</p>
        </GlassCard>
        <GlassCard padding="md" className="border-ninja-green/30">
          <p className="stat-label text-ninja-green">Available</p>
          <p className="stat-value text-ninja-green">{availableCount}</p>
        </GlassCard>
        <GlassCard padding="md">
          <p className="stat-label">Purchased</p>
          <p className="stat-value">{purchasedCount}</p>
        </GlassCard>
        <GlassCard padding="md" className="border-ninja-green/40">
          <p className="stat-label text-ninja-green">Revenue</p>
          <p className="stat-value text-ninja-green">KSh {(purchasedCount * 300).toLocaleString()}</p>
        </GlassCard>
      </div>

      {/* Available Content */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Unlock className="w-5 h-5 text-ninja-green" />
          <h2 className="text-xl font-heading text-ninja-mint">Available Content</h2>
          <span className="px-2 py-1 rounded-full bg-ninja-green/20 text-ninja-green text-xs font-mono">
            {availableCount}
          </span>
        </div>

        {availableCount > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {contents
              .filter((c) => !c.is_purchased)
              .map((content) => (
                <div
                  key={content.id}
                  className="p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Unlock className="w-4 h-4 text-ninja-green" />
                        <span className="text-xs text-ninja-green uppercase tracking-wider">
                          Available
                        </span>
                      </div>
                      <h3 className="text-ninja-mint font-medium mb-2">{content.title}</h3>
                      <p className="text-ninja-sage text-sm line-clamp-2">{content.content}</p>
                      <p className="text-ninja-sage text-xs mt-2">
                        Added {format(new Date(content.created_at), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <button
                      onClick={() => openDeleteDialog(content)}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {content.images && content.images.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {content.images.map((img, idx) => (
                        <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-ninja-green/10">
                          <img src={img} alt={`${content.title} - ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <p className="text-ninja-sage text-center py-8">No available content</p>
        )}
      </GlassCard>

      {/* Purchased Content */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-ninja-sage" />
          <h2 className="text-xl font-heading text-ninja-mint">Purchased Content</h2>
          <span className="px-2 py-1 rounded-full bg-ninja-green/20 text-ninja-green text-xs font-mono">
            {purchasedCount}
          </span>
        </div>

        {purchasedCount > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {contents
              .filter((c) => c.is_purchased)
              .map((content) => (
                <div
                  key={content.id}
                  className="p-4 rounded-xl bg-ninja-black/50 border border-ninja-green/10 opacity-70"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-ninja-sage" />
                        <span className="text-xs text-ninja-sage uppercase tracking-wider">
                          Purchased
                        </span>
                      </div>
                      <h3 className="text-ninja-mint font-medium mb-2">{content.title}</h3>
                      <p className="text-ninja-sage text-xs">
                        Purchased {content.purchased_at && format(new Date(content.purchased_at), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <Check className="w-5 h-5 text-ninja-green" />
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-ninja-sage text-center py-8">No purchased content yet</p>
        )}
      </GlassCard>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading text-ninja-mint">
              Add Mafullu Content
            </DialogTitle>
            <DialogDescription className="text-ninja-sage">
              Create a new premium content pack
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-ninja-mint">Title</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Content title"
                className={cn('input-field', errors.title && 'border-red-500/50')}
              />
              {errors.title && <p className="text-red-400 text-sm">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-ninja-mint">Content</Label>
              <Textarea
                id="content"
                {...register('content')}
                placeholder="Enter the content..."
                rows={6}
                className={cn('input-field resize-none', errors.content && 'border-red-500/50')}
              />
              {errors.content && <p className="text-red-400 text-sm">{errors.content.message}</p>}
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
              {isSubmitting ? 'Creating...' : 'Create Content'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-ninja-dark/95 backdrop-blur-xl border-ninja-green/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading text-ninja-mint">
              Delete Content
            </DialogTitle>
            <DialogDescription className="text-ninja-sage">
              Are you sure you want to delete this content? This action cannot be undone.
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
