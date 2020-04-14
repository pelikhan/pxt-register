namespace i2cRegister {

    export function write_then_readinto(i2c: pins.I2CDevice, outBuffer: Buffer, inBuffer: Buffer, outEnd: number, inStart: number) {
        if (outBuffer && outEnd > 0)
            i2c.write(outBuffer.slice(0, outEnd), false);
        if (inBuffer)
            i2c.readInto(inBuffer, false, inStart);
    }

    /** 
    * Single bit register that is readable and writeable.
    */
    export class RWBit {
        bit_mask: number;
        buffer: Buffer;
        byte: number;

        /** 
            Single bit register that is readable and writeable.

            Values are `bool`

            @param register_address: The register address to read the bit from
            @param bit: The bit index within the byte at ``register_address``
            @param register_width: The number of bytes in the register. Defaults to 1.
            @param lsb_first: Is the first byte we read from I2C the LSB? Defaults to true            
        */
        constructor(register_address: number, bit: number, register_width: number = 1, lsb_first: boolean = true) {
            // the bitmask *within* the byte!
            this.bit_mask = 1 << bit % 8
            this.buffer = pins.createBuffer(1 + register_width)
            this.buffer[0] = register_address
            if (lsb_first) {
                // the byte number within the buffer
                this.byte = Math.idiv(bit, 8) + 1
            } else {
                // the byte number within the buffer
                this.byte = register_width - Math.idiv(bit, 8)
            }
        }
        
        public value(i2cDev: pins.I2CDevice): boolean {
            const i2c = i2cDev.begin()
            write_then_readinto(i2c, this.buffer, this.buffer, 1, 1)
            return !!(this.buffer[this.byte] & this.bit_mask)
        }
        
        public setValue(i2cDev: pins.I2CDevice, v: boolean) {
            const i2c = i2cDev.begin()
            write_then_readinto(i2c, this.buffer, this.buffer, 1, 1)
            if (v) {
                this.buffer[this.byte] |= this.bit_mask
            } else {
                this.buffer[this.byte] &= ~this.bit_mask
            }                
            i2c.write(this.buffer)
            i2c.end()
        }        
    }
}