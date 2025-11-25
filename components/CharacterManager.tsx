

import React, { useRef, useState } from 'react';
import { Character } from '../types';
import { Button } from './Button';
import { Plus, Trash2, User, Star, X, Video } from 'lucide-react';

interface CharacterManagerProps {
  characters: Character[];
  onCharactersChange: (chars: Character[]) => void;
  videoPromptNote?: string;
  onVideoPromptNoteChange?: (note: string) => void;
}

export const CharacterManager: React.FC<CharacterManagerProps> = ({
  characters,
  onCharactersChange,
  videoPromptNote,
  onVideoPromptNoteChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

  const addCharacter = () => {
    // Only first character is default if list is empty
    const isFirst = characters.length === 0;
    const newChar: Character = {
      id: crypto.randomUUID(),
      name: `Nhân vật ${characters.length + 1}`,
      description: '',
      imageReferences: [],
      isDefault: isFirst, 
    };
    onCharactersChange([...characters, newChar]);
  };

  const removeCharacter = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa nhân vật này?')) {
      const newChars = characters.filter(c => c.id !== id);
      // If we deleted the default, make the first available one default
      if (characters.find(c => c.id === id)?.isDefault && newChars.length > 0) {
        newChars[0].isDefault = true;
      }
      onCharactersChange(newChars);
    }
  };

  const updateCharacter = (id: string, field: keyof Character, value: any) => {
    onCharactersChange(characters.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const toggleDefault = (id: string) => {
    // Only one default allowed, set clicked to true, others to false
    onCharactersChange(characters.map(c => ({ ...c, isDefault: c.id === id })));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeUploadId) return;

    const charId = activeUploadId;
    const char = characters.find(c => c.id === charId);
    if (!char) return;

    if (char.imageReferences.length + files.length > 5) {
      alert("Mỗi nhân vật chỉ được tối đa 5 ảnh.");
      // Allow uploading what fits? No, just return for now to keep it simple.
      e.target.value = '';
      return;
    }

    const newImages: string[] = [];
    let processed = 0;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        newImages.push(base64);
        processed++;
        
        if (processed === files.length) {
          updateCharacter(charId, 'imageReferences', [...char.imageReferences, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    e.target.value = ''; // Reset
  };

  const removeImage = (charId: string, imgIndex: number) => {
    const char = characters.find(c => c.id === charId);
    if (char) {
      const newImages = char.imageReferences.filter((_, i) => i !== imgIndex);
      updateCharacter(charId, 'imageReferences', newImages);
    }
  };

  const triggerUpload = (id: string) => {
    setActiveUploadId(id);
    fileInputRef.current?.click();
  };

  return (
    <div className="mb-8 border border-zinc-800 rounded-xl bg-zinc-900/40 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <User className="text-brand-green" size={20} />
          Quản Lý Nhân Vật ([3] Character Upload)
        </h3>
        <Button variant="secondary" onClick={addCharacter} className="text-sm">
          <Plus size={16} className="mr-2" /> Thêm Nhân Vật
        </Button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        multiple
        className="hidden" 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {characters.map((char) => (
          <div key={char.id} className={`bg-black border rounded-lg p-4 flex flex-col gap-3 transition-all duration-300 relative group ${char.isDefault ? 'border-brand-green shadow-[0_0_15px_rgba(22,163,74,0.2)]' : 'border-zinc-700 hover:border-zinc-500'}`}>
            
            {/* Header: Name & Tools */}
            <div className="flex justify-between items-center gap-2">
              <input
                type="text"
                value={char.name}
                onChange={(e) => updateCharacter(char.id, 'name', e.target.value)}
                className="flex-grow bg-transparent text-base font-bold text-white focus:outline-none border-b border-transparent focus:border-brand-green placeholder:text-zinc-700"
                placeholder="Tên nhân vật..."
              />
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => toggleDefault(char.id)}
                  className={`p-1.5 rounded-full transition-colors ${char.isDefault ? 'text-yellow-400 bg-yellow-400/10' : 'text-zinc-600 hover:text-yellow-400'}`}
                  title={char.isDefault ? "Nhân vật mặc định (Default)" : "Đặt làm mặc định"}
                >
                  <Star size={18} fill={char.isDefault ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={() => removeCharacter(char.id)}
                  className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
                 <label className="text-[10px] uppercase text-zinc-500 font-bold">Đặc điểm đồng nhất (Quần áo, style...)</label>
                 <textarea
                  value={char.description}
                  onChange={(e) => updateCharacter(char.id, 'description', e.target.value)}
                  placeholder="Mô tả: Áo hoodie đỏ, tóc xoăn, đeo kính..."
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:outline-none focus:border-brand-green/50 resize-none h-16 custom-scrollbar mt-1"
                />
            </div>

            {/* Image Gallery (1-5 images) */}
            <div className="space-y-2 flex-grow flex flex-col justify-end">
              <div className="flex justify-between items-center text-xs text-zinc-500 uppercase font-bold tracking-wider">
                <span>Ảnh mẫu ({char.imageReferences.length}/5)</span>
                <button onClick={() => triggerUpload(char.id)} className="text-brand-lightGreen hover:text-white flex items-center gap-1">
                   <Plus size={12} /> Thêm ảnh
                </button>
              </div>
              
              <div 
                className="grid grid-cols-5 gap-1 min-h-[60px] bg-zinc-900/30 p-1 rounded border border-zinc-800/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) {
                        const files = Array.from(e.dataTransfer.files);
                         if (char.imageReferences.length + files.length > 5) {
                            alert("Mỗi nhân vật chỉ được tối đa 5 ảnh.");
                            return;
                        }
                        // Simple helper to process drop
                        setActiveUploadId(char.id); 
                        // Note: Can't easily reuse handleImageUpload logic without refactoring, 
                        // so duplicating reader logic briefly here for drag-drop convenience
                        const newImages: string[] = [];
                        let processed = 0;
                        files.forEach(file => {
                            if(!file.type.startsWith('image/')) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                newImages.push(ev.target?.result as string);
                                processed++;
                                if (processed === files.length) {
                                     updateCharacter(char.id, 'imageReferences', [...char.imageReferences, ...newImages]);
                                }
                            }
                            reader.readAsDataURL(file);
                        });
                    }
                }}
              >
                {char.imageReferences.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded overflow-hidden border border-zinc-700 bg-black">
                      <img src={img} alt="ref" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImage(char.id, idx)}
                        className="absolute top-0 right-0 bg-red-600 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                ))}
                {char.imageReferences.length < 5 && (
                     <button 
                        onClick={() => triggerUpload(char.id)}
                        className="aspect-square flex items-center justify-center border border-dashed border-zinc-700 rounded text-zinc-600 hover:text-brand-green hover:border-brand-green/50 transition-colors"
                     >
                         <Plus size={14} />
                     </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {characters.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg bg-zinc-950/30">
             <User size={48} className="mx-auto mb-3 opacity-20" />
             <p>Chưa có nhân vật nào. Hãy thêm nhân vật để bắt đầu.</p>
             <Button variant="secondary" onClick={addCharacter} className="mt-4">
                Thêm Nhân Vật Ngay
             </Button>
          </div>
        )}
      </div>

      {/* Global Video Prompt Note */}
      <div className="border-t border-zinc-800 pt-6">
        <label className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider mb-2">
            <Video size={16} className="text-brand-green" />
            Lưu ý cho Prompt tạo Video (Global Video Note)
        </label>
        <p className="text-xs text-zinc-500 mb-2">
            Nội dung này sẽ được áp dụng cho tất cả các prompt tạo video bên dưới. Ví dụ: "Không có nhạc nền...", "Nhân vật không nhép miệng"...
        </p>
        <div className="relative">
             <textarea 
                value={videoPromptNote || ""}
                onChange={(e) => onVideoPromptNoteChange && onVideoPromptNoteChange(e.target.value)}
                placeholder="Không có nhạc nền, chỉ sử dụng âm thanh môi trường nếu cần. Nhân vật chỉ hành động minh họa cho kịch bản chứ không có nhép miệng theo lời thoại."
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-brand-green min-h-[80px] resize-none custom-scrollbar placeholder:text-zinc-700"
             />
        </div>
      </div>
    </div>
  );
};