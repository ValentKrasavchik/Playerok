import { assetUrl } from '../assets';

type RadioProps = {
  checked: boolean;
};

export function Radio({ checked }: RadioProps) {
  return (
    <span className="radio" aria-hidden="true">
      <img
        src={
          checked
            ? assetUrl('icons/radio-checked-bg.svg')
            : assetUrl('icons/radio-unchecked.svg')
        }
        alt=""
        width={32}
        height={32}
      />
    </span>
  );
}
