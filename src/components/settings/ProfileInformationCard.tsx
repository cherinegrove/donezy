
import { useState, useRef } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Upload, User, UserRound, UsersRound, Smile, Meh, Heart, Star } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Predefined avatar options
const avatarOptions = [
  { id: 'avatar1', url: 'https://source.unsplash.com/photo-1501286353178-1ec881214838/100x100', name: 'Monkey' },
  { id: 'avatar2', url: 'https://source.unsplash.com/photo-1582562124811-c09040d0a901/100x100', name: 'Cat' },
  { id: 'avatar3', url: 'https://source.unsplash.com/photo-1535268647677-300dbf3d78d1/100x100', name: 'Kitten' },
  { id: 'avatar4', url: 'https://source.unsplash.com/photo-1441057206919-63d19fac2369/100x100', name: 'Penguin' }
];

export function ProfileInformationCard({ userId }: { userId: string }) {
  const { getUserById, updateUser } = useAppContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  if (!user) return null;
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create a URL for the uploaded file to show preview
    const imageUrl = URL.createObjectURL(file);
    setPreviewImage(imageUrl);
    
    // Convert image to base64 for storage
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        avatar: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
    setShowAvatarOptions(false);
  };
  
  const handleSelectImage = () => {
    fileInputRef.current?.click();
  };
  
  const handleAvatarOptionSelect = (avatarUrl: string) => {
    setPreviewImage(avatarUrl);
    setFormData(prev => ({
      ...prev,
      avatar: avatarUrl
    }));
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
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your personal details and contact information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={previewImage || user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleSelectImage}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload
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
              <div className="mt-4 w-full max-w-md">
                <RadioGroup 
                  value={formData.avatar}
                  onValueChange={handleAvatarOptionSelect}
                  className="grid grid-cols-2 gap-4 md:grid-cols-4"
                >
                  {avatarOptions.map((avatar) => (
                    <div 
                      key={avatar.id} 
                      className="flex flex-col items-center space-y-2"
                    >
                      <label 
                        htmlFor={avatar.id}
                        className="flex flex-col items-center cursor-pointer space-y-2"
                      >
                        <Avatar className="h-16 w-16 transition-all hover:scale-110">
                          <AvatarImage src={avatar.url} alt={avatar.name} />
                          <AvatarFallback>
                            <UserRound className="h-8 w-8" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem id={avatar.id} value={avatar.url} className="sr-only" />
                          <span className="text-xs">{avatar.name}</span>
                        </div>
                      </label>
                    </div>
                  ))}
                </RadioGroup>
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
          
          <Button type="submit" className="w-full md:w-auto">Save Changes</Button>
        </form>
      </CardContent>
    </Card>
  );
}
