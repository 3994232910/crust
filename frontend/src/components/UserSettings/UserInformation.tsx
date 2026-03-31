import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Camera, X } from "lucide-react"

import { UsersService, type UserUpdateMe } from "@/client"
import { OpenAPI } from "@/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { handleError } from "@/utils"
import { getInitials } from "@/utils"

const formSchema = z.object({
  full_name: z.string().max(30).optional(),
  email: z.email({ message: "Invalid email address" }),
})

type FormData = z.infer<typeof formSchema>

const UserInformation = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [editMode, setEditMode] = useState(false)
  const { user: currentUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      full_name: currentUser?.full_name ?? undefined,
      email: currentUser?.email,
    },
  })

  const toggleEditMode = () => {
    setEditMode(!editMode)
  }

  const mutation = useMutation({
    mutationFn: (data: UserUpdateMe) =>
      UsersService.updateUserMe({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("User updated successfully")
      toggleEditMode()
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })

  const onSubmit = (data: FormData) => {
    const updateData: UserUpdateMe = {}

    // only include fields that have changed
    if (data.full_name !== currentUser?.full_name) {
      updateData.full_name = data.full_name
    }
    if (data.email !== currentUser?.email) {
      updateData.email = data.email
    }

    mutation.mutate(updateData)
  }

  const onCancel = () => {
    form.reset()
    toggleEditMode()
  }

  // Avatar upload mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file, file.name)
      
      // 直接使用 fetch 调用 API，绕过 SDK
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${OpenAPI.BASE}/api/v1/users/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Upload failed')
      }
      
      return response.json()
    },
    onSuccess: () => {
      showSuccessToast("Avatar uploaded successfully")
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  // Delete avatar mutation
  const deleteAvatarMutation = useMutation({
    mutationFn: () => UsersService.deleteAvatar(),
    onSuccess: () => {
      showSuccessToast("Avatar deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showErrorToast("Please select an image file")
        return
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showErrorToast("File size must be less than 5MB")
        return
      }
      
      uploadAvatarMutation.mutate(file)
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeleteAvatar = () => {
    deleteAvatarMutation.mutate()
  }

  return (
    <div className="max-w-md">
      <h3 className="text-lg font-semibold py-4">User Information</h3>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {/* Avatar Section */}
          <div className="flex items-center gap-4 py-4">
            <div className="relative">
              <Avatar className="size-20">
                {currentUser?.avatar_url ? (
                  <>
                    <AvatarImage 
                      src={`${OpenAPI.BASE}${currentUser.avatar_url}`} 
                      alt={currentUser.full_name || "Avatar"}
                    />
                    <AvatarFallback className="bg-zinc-600 text-white text-xl">
                      {getInitials(currentUser.full_name || "User")}
                    </AvatarFallback>
                  </>
                ) : (
                  <AvatarFallback className="bg-zinc-600 text-white text-xl">
                    {getInitials(currentUser?.full_name || "User")}
                  </AvatarFallback>
                )}
              </Avatar>
              {currentUser?.avatar_url && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 size-6 rounded-full"
                  onClick={handleDeleteAvatar}
                  disabled={deleteAvatarMutation.isPending}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAvatarClick}
                disabled={uploadAvatarMutation.isPending}
                className="gap-2"
              >
                <Camera className="size-4" />
                {currentUser?.avatar_url ? "Change Avatar" : "Upload Avatar"}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, GIF or WebP. Max 5MB.
              </p>
            </div>
          </div>

          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) =>
              editMode ? (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              ) : (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <p
                    className={cn(
                      "py-2 truncate max-w-sm",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    {field.value || "N/A"}
                  </p>
                </FormItem>
              )
            }
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) =>
              editMode ? (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              ) : (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <p className="py-2 truncate max-w-sm">{field.value}</p>
                </FormItem>
              )
            }
          />

          <div className="flex gap-3">
            {editMode ? (
              <>
                <LoadingButton
                  type="submit"
                  loading={mutation.isPending}
                  disabled={!form.formState.isDirty}
                >
                  Save
                </LoadingButton>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button type="button" onClick={toggleEditMode}>
                Edit
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}

export default UserInformation
