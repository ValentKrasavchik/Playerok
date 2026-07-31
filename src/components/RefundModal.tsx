import { StrictRefundModal } from './StrictRefundModal';
import { FlexibleRefundModal } from './FlexibleRefundModal';
import type { RefundDemoContext } from '../refundLogic';

type RefundModalProps = {
  context: RefundDemoContext;
  onClose: () => void;
  onBack: () => void;
  onSuccess: (message: string) => void;
};

export function RefundModal(props: RefundModalProps) {
  if (props.context.mode === 'flexible') {
    return <FlexibleRefundModal {...props} />;
  }

  return <StrictRefundModal {...props} />;
}
