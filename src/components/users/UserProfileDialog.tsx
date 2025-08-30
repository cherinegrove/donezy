
import { useAppContext } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Smile, UserRound } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

// Predefined avatar options with fun cartoon avatars
const avatarOptions = [
  { id: 'avatar1', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix', name: 'Robot' },
  { id: 'avatar2', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ninja', name: 'Ninja' },
  { id: 'avatar3', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alien', name: 'Alien' },
  { id: 'avatar4', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Astronaut', name: 'Astronaut' },
  { id: 'avatar5', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Pirate', name: 'Pirate' },
  { id: 'avatar6', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Viking', name: 'Viking' },
  { id: 'avatar7', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Wizard', name: 'Wizard' },
  { id: 'avatar8', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Superhero', name: 'Superhero' },
  { id: 'avatar9', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Knight', name: 'Knight' },
  { id: 'avatar10', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Samurai', name: 'Samurai' },
  { id: 'avatar11', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyborg', name: 'Cyborg' },
  { id: 'avatar12', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Explorer', name: 'Explorer' },
  { id: 'avatar13', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Detective', name: 'Detective' },
  { id: 'avatar14', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Android', name: 'Android' },
  { id: 'avatar15', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Archer', name: 'Archer' },
  { id: 'avatar16', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mage', name: 'Mage' }
];

export function UserProfileDialog({
  open,
  onOpenChange,
  userId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}) {
  const { getUserById, updateUser } = useAppContext();
  const { toast } = useToast();
  const user = getUserById(userId);

  const [formData, setFormData] = useState({
    firstName: user?.name.split(' ')[0] || '',
    lastName: user?.name.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || ''
  });

  const [previewImage, setPreviewImage] = useState<string | null>(user?.avatar || null);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }
    
    setUploading(true);
    
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.auth_user_id}/${Date.now()}.${fileExt}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Update preview and form data
      setPreviewImage(publicUrl);
      setFormData(prev => ({
        ...prev,
        avatar: publicUrl
      }));
      
      setShowAvatarOptions(false);
      
      toast({
        title: "Avatar uploaded",
        description: "Your new avatar has been uploaded successfully."
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your avatar.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  
  const handleAvatarOptionSelect = (avatarUrl: string) => {
    console.log("Avatar selection started:", avatarUrl);
    try {
      setPreviewImage(avatarUrl);
      setFormData(prev => ({
        ...prev,
        avatar: avatarUrl
      }));
      console.log("Avatar selection completed successfully");
    } catch (error) {
      console.error("Error selecting avatar:", error);
      toast({
        title: "Avatar selection failed",
        description: "There was an error selecting the avatar. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateUser(userId, {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      avatar: formData.avatar,
      phone: formData.phone
    });
    
    toast({
      title: "Profile updated",
      description: "Your profile information has been updated successfully."
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              {previewImage ? (
                <AvatarImage src={previewImage} alt={user.name} />
              ) : (
                <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="avatar-upload"
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => document.getElementById('avatar-upload')?.click()}
                className="flex items-center gap-2"
                disabled={uploading}
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAvatarOptions(!showAvatarOptions)}
                className="flex items-center gap-2"
              >
                <Smile className="h-4 w-4" />
                Choose Avatar
              </Button>
            </div>
            
            {showAvatarOptions && (
              <div className="mt-4 w-full">
                <div className="grid grid-cols-3 gap-4">
                  {avatarOptions.map((avatar) => (
                    <div 
                      key={avatar.id} 
                      className="flex flex-col items-center space-y-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleAvatarOptionSelect(avatar.url)}
                        className={`flex flex-col items-center cursor-pointer space-y-2 transition-all hover:scale-110 p-2 rounded-lg ${
                          formData.avatar === avatar.url ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-transparent hover:border-primary">
                          <Avatar className="h-16 w-16">
                            <AvatarImage 
                              src={avatar.url} 
                              alt={avatar.name} 
                              className="object-cover"
                            />
                            <AvatarFallback>
                              <UserRound className="h-8 w-8" />
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="text-xs font-medium">{avatar.name}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="firstName" className="mb-2 block">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="John"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="mb-2 block">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Doe"
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="mb-2 block">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john.doe@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone" className="mb-2 block">Contact Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center">
            <LogoutButton variant="button" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
