
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const gcpInventoryFormSchema = z.object({
  resourceType: z.string().min(1, "Resource Type is required"),
  projectId: z.string().min(1, "Project ID is required"),
  displayName: z.string().min(1, "Display Name is required"),
  location: z.string().min(1, "Location is required"),
  status: z.string().min(1, "Status is required"),
  remarks: z.string().optional(),
});

type GcpInventoryFormValues = z.infer<typeof gcpInventoryFormSchema>;

interface GcpInventoryFormProps {
  onSubmit: (values: GcpInventoryFormValues) => void;
  isLoading: boolean;
  defaultValues?: Partial<GcpInventoryFormValues>;
}

export default function GcpInventoryForm({
  onSubmit,
  isLoading,
  defaultValues = {
    resourceType: "",
    projectId: "",
    displayName: "",
    location: "",
    status: "active",
    remarks: "",
  }
}: GcpInventoryFormProps) {
  const form = useForm<GcpInventoryFormValues>({
    resolver: zodResolver(gcpInventoryFormSchema),
    defaultValues: {
      resourceType: defaultValues?.resourceType || "",
      projectId: defaultValues?.projectId || "",
      displayName: defaultValues?.displayName || "",
      location: defaultValues?.location || "",
      status: defaultValues?.status || "active",
      remarks: defaultValues?.remarks || "",
    },
    mode: "onChange",
  });

  const handleSubmit = (values: GcpInventoryFormValues) => {
    const sanitizedValues = {
      name: values.displayName?.trim() || "", // Use displayName as name for backend compatibility
      resourceType: values.resourceType?.trim() || "",
      projectId: values.projectId?.trim() || "",
      displayName: values.displayName?.trim() || "",
      location: values.location?.trim() || "",
      status: values.status || "active",
      remarks: values.remarks?.trim() || null,
    };
    onSubmit(sanitizedValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="resourceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resource Type*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Compute Engine, Cloud Storage" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project ID*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. my-project-123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Production Instance" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. us-central1, europe-west1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status*</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="stopped">Stopped</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remarks</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isLoading}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isLoading || !form.formState.isValid}>
            {isLoading ? "Saving..." : "Save Resource"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
