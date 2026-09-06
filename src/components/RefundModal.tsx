import { StrictRefundModal } from './StrictRefundModal';
import type { RefundDemoContext } from '../refundLogic';
import type { RefundLogData } from './RefundLogModal';

type RefundModalProps = {
  context: RefundDemoContext;
  onClose: () => void;
  onBack: () => void;
  onSuccess: (message: string) => void;
  onRefundCompleted?: (log: RefundLogData) => void;
  embedded?: boolean;
};

export function RefundModal(props: RefundModalProps) {
  return <StrictRefundModal {...props} />;
}
