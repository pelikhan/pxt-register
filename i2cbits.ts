namespace register {
    function range(start: number, end: number, interval: number = 1) {
        let r: number[] = [];
        if (interval > 0)
            for(let i = start; i <= end; ++i)
                r.push(i);
        else
            for(let i = start; i >= end; --i)
                r.push(i);
        return r;
    }

    function reversed(a: number[]) {
        const r = a.slice(0);
        r.reverse();
        return r;
    }    
    /**
    * Multibit register (less than a full byte) that is readable and writeable.
    * This must be within a byte register.
     */
    export class I2CRWBits {
        bit_mask: number
        lowest_bit: number
        buffer: Buffer
        lsb_first: boolean
        /** 
            Values are `int` between 0 and 2 ** ``num_bits`` - 1.

            @param num_bits: The number of bits in the field.
            @param register_address: The register address to read the bit from
            @param lowest_bit: The lowest bits index within the byte at ``register_address``
            @param register_width: The number of bytes in the register. Defaults to 1.
            @param lsb_first: Is the first byte we read from I2C the LSB? Defaults to true
            
        */
        constructor(num_bits: number, register_address: number, lowest_bit: number, register_width: number = 1, lsb_first: boolean = true) {
            this.bit_mask = (1 << num_bits) - 1 << lowest_bit
            // print("bitmask: ",hex(self.bit_mask))
            if (this.bit_mask >= 1 << register_width * 8) {
                control.fail("Cannot have more bits than register size")
            }
            
            this.lowest_bit = lowest_bit
            this.buffer = pins.createBuffer(1 + register_width)
            this.buffer[0] = register_address
            this.lsb_first = lsb_first
        }
        
        public value(i2cDev: pins.I2CDevice): number {
            {
                const i2c = i2cDev.begin()
                write_then_readinto(i2c, this.buffer, this.buffer, 1, 1)
                i2c.end()
            }
            // read the number of bytes into a single variable
            let reg = 0
            let order = range(this.buffer.length - 1, 0, -1)
            if (!this.lsb_first) {
                order.reverse();
            }
            
            for (let i of order) {
                reg = reg << 8 | this.buffer[i]
            }
            return (reg & this.bit_mask) >> this.lowest_bit
        }

        
        public setValue(i2cDev: pins.I2CDevice, value: number): void {
            // shift the value over to the right spot
            value <<= this.lowest_bit;
            const i2c = i2cDev.begin()
            write_then_readinto(i2c, this.buffer, this.buffer, 1, 1)
            let reg = 0
            let order = range(this.buffer.length - 1, 0, -1)
            if (!this.lsb_first) {
                order = range(1, this.buffer.length)
            }
            
            for (let i of order) {
                reg = reg << 8 | this.buffer[i]
            }
            // print("old reg: ", hex(reg))
            // mask off the bits we're about to change
            reg &= ~this.bit_mask
            // then or in our new value
            reg |= value
            // print("new reg: ", hex(reg))
            for (let i of reversed(order)) {
                this.buffer[i] = reg & 0xFF
                reg >>= 8
            }
            i2c.write(this.buffer)
            i2c.end()
        }    
    }
}
