import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const awsInventoryFormSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  service: z.string().min(1, "Service is required"),
  type: z.string().min(1, "Type is required"),
  region: z.string().min(1, "Region is required"),
  accountName: z.string().min(1, "Account Name is required"),
  accountId: z.string().min(1, "Account ID is required"),
  status: z.string().min(1, "Status is required"),
  remarks: z.string().optional(),
});

type AwsInventoryFormValues = z.infer<typeof awsInventoryFormSchema>;

interface AwsInventoryFormProps {
  onSubmit: (values: AwsInventoryFormValues) => void;
  isLoading: boolean;
  defaultValues?: Partial<AwsInventoryFormValues>;
}

export default function AwsInventoryForm({
  onSubmit,
  isLoading,
  defaultValues = {
    identifier: "",
    service: "",
    type: "",
    region: "",
    accountName: "",
    accountId: "",
    status: "active",
    remarks: "",
  }
}: AwsInventoryFormProps) {
  const form = useForm<AwsInventoryFormValues>({
    resolver: zodResolver(awsInventoryFormSchema),
    defaultValues: {
      identifier: defaultValues?.identifier || "",
      service: defaultValues?.service || "",
      type: defaultValues?.type || "",
      region: defaultValues?.region || "",
      accountName: defaultValues?.accountName || "",
      accountId: defaultValues?.accountId || "",
      status: defaultValues?.status || "active",
      remarks: defaultValues?.remarks || "",
    },
    mode: "onChange",
  });

  const handleSubmit = (values: AwsInventoryFormValues) => {
    const sanitizedValues = {
      identifier: values.identifier?.trim() || "",
      service: values.service?.trim() || "",
      type: values.type?.trim() || "",
      region: values.region?.trim() || "",
      accountName: values.accountName?.trim() || "",
      accountId: values.accountId?.trim() || "",
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
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Identifier*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. i-1234567890abcdef0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="service"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. EC2, S3, RDS" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. t3.medium, db.t3.micro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Region*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. us-east-1, eu-west-1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Production Account" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account ID*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 123456789012" {...field} />
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
                    <SelectItem value="terminated">Terminated</SelectItem>
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