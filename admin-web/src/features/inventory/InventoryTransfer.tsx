import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem, InputLabel, FormControl, CircularProgress, FormHelperText } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const transferSchema = z.object({
  inventoryItemId: z.string().min(1, 'Please select a material'),
  toBranchId: z.string().min(1, 'Please select a destination branch'),
  quantity: z.preprocess((val) => Number(val), z.number().positive('Quantity must be greater than 0')),
});

type TransferFormValues = z.infer<typeof transferSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  inventoryItems: any[];
}

export default function InventoryTransfer({ open, onClose, inventoryItems }: Props) {
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      inventoryItemId: '',
      toBranchId: '',
      quantity: '' as any,
    }
  });

  const { data: branches, isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/branch-admin/branches');
        return res.data;
      } catch {
        return [
           { id: 'b1', name: 'Downtown HQ' },
           { id: 'b2', name: 'Westside Branch' }
        ];
      }
    },
    enabled: open
  });

  const transferMutation = useMutation({
    mutationFn: (data: any) => axiosClient.post('/inventory/transfer', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
      onClose();
      reset();
      alert('Transfer successful');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Transfer failed');
    }
  });

  const onSubmit = (data: TransferFormValues) => {
    transferMutation.mutate({
      ...data,
      fromBranchId: 'b1', // Using mock default for current branch
    });
  };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: '16px', bgcolor: '#1E293B', color: '#fff', minWidth: 400, border: '1px solid rgba(255,255,255,0.1)' } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>Transfer Stock</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Controller
            name="inventoryItemId"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.inventoryItemId} sx={{ mt: 1 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Select Material</InputLabel>
                <Select
                  {...field}
                  label="Select Material"
                  sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                >
                  {inventoryItems.map(item => (
                    <MenuItem key={item.id} value={item.id}>{item.name} ({item.quantity} available)</MenuItem>
                  ))}
                </Select>
                {errors.inventoryItemId && <FormHelperText>{errors.inventoryItemId.message}</FormHelperText>}
              </FormControl>
            )}
          />

          <Controller
            name="toBranchId"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.toBranchId}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Destination Branch</InputLabel>
                <Select
                  {...field}
                  label="Destination Branch"
                  sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                >
                  {loadingBranches ? <MenuItem disabled>Loading...</MenuItem> : branches?.map((b: any) => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
                </Select>
                {errors.toBranchId && <FormHelperText>{errors.toBranchId.message}</FormHelperText>}
              </FormControl>
            )}
          />

          <Controller
            name="quantity"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Quantity to Transfer"
                type="number"
                fullWidth
                error={!!errors.quantity}
                helperText={errors.quantity?.message}
                sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
              />
            )}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button 
            type="submit"
            disabled={transferMutation.isPending} 
            variant="contained" 
            sx={{ bgcolor: '#6366F1', fontWeight: 700, textTransform: 'none', borderRadius: '8px', '&:hover': { bgcolor: '#4F46E5' } }}
          >
            {transferMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Confirm Transfer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
