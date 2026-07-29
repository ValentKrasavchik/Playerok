type RadioProps = {
  checked: boolean;
};

export function Radio({ checked }: RadioProps) {
  return (
    <span className="radio" aria-hidden="true">
      <img
        src={checked ? '/icons/radio-checked-bg.svg' : '/icons/radio-unchecked.svg'}
        alt=""
        width={32}
        height={32}
      />
      {checked ? (
        <span className="radio__check">
          <img src="/icons/radio-check.svg" alt="" width={24} height={24} />
        </span>
      ) : null}
    </span>
  );
}
