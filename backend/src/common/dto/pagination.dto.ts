import { Field, InputType, Int } from '@nestjs/graphql';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

@InputType()
export class PaginationInput {
    @Field(() => Int, { defaultValue: 20 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    take: number = 20;

    @Field(() => Int, { defaultValue: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    skip: number = 0;
}
